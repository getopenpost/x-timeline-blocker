import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { launch, extensionId, popup, gateFrame } from './fixture';
interface TimerReply {
  ok: boolean;
  window: { startedAt: number; endsAt: number; nextAt: number };
}
const SCREENSHOTS = '.impeccable/review/screenshots';
test('packaged gate preserves compose and SPA routes, survives replacement, and shares one explicit grant', async () => {
  const profile = await mkdtemp(join(tmpdir(), 'x-blocker-'));
  const context = await launch(profile);
  try {
    const id = await extensionId(context);
    const first = await context.newPage();
    const second = await context.newPage();
    await first.goto('https://x.com/home');
    await second.goto('https://twitter.com/home');
    const gate = await gateFrame(first);
    await expect(
      gate.getByRole('button', { name: 'Browse timeline' }),
    ).toBeVisible();
    await expect(first.getByRole('article').first()).toBeHidden();
    await first
      .getByRole('textbox', { name: 'Post text' })
      .fill('A post while the timeline is paused');
    await first.getByRole('button', { name: 'Post now' }).click();
    await expect(first.locator('#sent')).toHaveText('Posted');
    await first.getByRole('button', { name: 'Replace timeline' }).click();
    await expect(first.getByRole('article').first()).toBeHidden();
    await expect(first.locator('[data-openpost-timeline-gate]')).toHaveCount(1);
    for (const name of [
      'Messages',
      'Notifications',
      'Bookmarks',
      'Profile',
      'Post',
      'Permalink',
    ]) {
      await first.getByRole('link', { name, exact: true }).click();
      await expect(first.locator('#allowed')).toBeVisible();
      await expect(first.locator('[data-openpost-timeline-gate]')).toHaveCount(
        0,
      );
    }
    await first.getByRole('link', { name: 'Home', exact: true }).click();
    await expect(first.getByRole('article').first()).toBeHidden();
    await (
      await gateFrame(first)
    )
      .getByRole('button', { name: 'Browse timeline' })
      .click();
    await expect(first.getByRole('article').first()).toBeVisible();
    await expect(second.getByRole('article').first()).toBeVisible();
    const view = await popup(context, id);
    await expect(
      view.getByRole('heading', { name: 'Time left' }),
    ).toBeVisible();
    await expect(
      view.getByRole('button', { name: 'Browse timeline' }),
    ).toHaveCount(0);
    const responses = await Promise.all(
      [view, await popup(context, id)].map((page) =>
        page.evaluate<TimerReply>("chrome.runtime.sendMessage({type:'grant'})"),
      ),
    );
    expect(responses[0].window).toEqual(responses[1].window);
    expect(responses[0].window.endsAt - responses[0].window.startedAt).toBe(
      300_000,
    );
    expect(responses[0].window.nextAt - responses[0].window.startedAt).toBe(
      3_600_000,
    );
    const accessibility = await new AxeBuilder({ page: view }).analyze();
    expect(accessibility.violations).toEqual([]);
  } finally {
    await context.close();
    await rm(profile, { recursive: true, force: true });
  }
});
test('expiry and browser restart retain the lock, then allow a new five-minute grant', async () => {
  const profile = await mkdtemp(join(tmpdir(), 'x-blocker-restart-'));
  let context = await launch(profile);
  try {
    const id = await extensionId(context);
    let view = await popup(context, id);
    const minuteBoundary = Date.now() + 3_000;
    await view.evaluate(
      `chrome.storage.local.set({timelineWindow:{version:1,startedAt:${minuteBoundary - 240_000},endsAt:${minuteBoundary + 60_000},nextAt:${minuteBoundary + 3_360_000}}})`,
    );
    await view.evaluate("chrome.runtime.sendMessage({type:'status'})");
    expect(await view.evaluate('chrome.action.getBadgeText({})')).toBe('2m');
    expect(
      await view.evaluate('chrome.action.getBadgeBackgroundColor({})'),
    ).toEqual([29, 78, 216, 255]);
    expect(
      (
        await view.evaluate<{ scheduledTime: number }>(
          "chrome.alarms.get('timeline-transition')",
        )
      ).scheduledTime,
    ).toBe(minuteBoundary);
    await expect
      .poll(() => view.evaluate('chrome.action.getBadgeText({})'))
      .toBe('1m');
    const now = Date.now();
    await view.evaluate(
      `chrome.storage.local.set({timelineWindow:{version:1,startedAt:${now - 299_000},endsAt:${now + 1_000},nextAt:${now + 3_301_000}}})`,
    );
    await view.evaluate("chrome.runtime.sendMessage({type:'status'})");
    await expect(
      view.getByRole('heading', { name: 'Time left' }),
    ).toBeVisible();
    const expiring = await context.newPage();
    await expiring.goto('https://x.com/home');
    await expect(expiring.getByRole('article').first()).toBeVisible();
    await expect(expiring.getByRole('article').first()).toBeHidden();
    await expect(view.getByRole('heading', { name: 'Back in' })).toBeVisible();
    await expect
      .poll(() => view.evaluate('chrome.action.getBadgeText({})'))
      .toBe('');
    await context.close();
    context = await launch(profile);
    view = await popup(context, await extensionId(context));
    await expect(view.getByRole('heading', { name: 'Back in' })).toBeVisible();
    expect(
      (
        await view.evaluate<TimerReply>(
          "chrome.runtime.sendMessage({type:'grant'})",
        )
      ).window.startedAt,
    ).toBe(now - 299_000);
    const home = await context.newPage();
    await home.goto('https://x.com/home');
    await expect(home.getByRole('article').first()).toBeHidden();
    const expiredAt = Date.now() - 3_600_000;
    await view.evaluate(
      `chrome.storage.local.set({timelineWindow:{version:1,startedAt:${expiredAt},endsAt:${expiredAt + 300_000},nextAt:${expiredAt + 3_600_000}}})`,
    );
    await expect(
      view.getByRole('button', { name: 'Browse timeline' }),
    ).toBeVisible();
    await (
      await gateFrame(home)
    )
      .getByRole('button', { name: 'Browse timeline' })
      .click();
    await expect(home.getByRole('article').first()).toBeVisible();
    await expect(
      view.getByRole('heading', { name: 'Time left' }),
    ).toBeVisible();
    const state = await view.evaluate<TimerReply>(
      "chrome.runtime.sendMessage({type:'status'})",
    );
    expect(state.window.startedAt).toBeGreaterThan(now);
  } finally {
    await context.close();
    await rm(profile, { recursive: true, force: true });
  }
});
test('popup and gate render ready, active and locked in light, dark and narrow layouts', async () => {
  const profile = await mkdtemp(join(tmpdir(), 'x-blocker-ui-'));
  const context = await launch(profile);
  try {
    const view = await popup(context, await extensionId(context));
    await mkdir(SCREENSHOTS, { recursive: true });
    await view.setViewportSize({ width: 300, height: 340 });
    await expect(
      view.getByRole('button', { name: 'Browse timeline' }),
    ).toBeVisible();
    await expect(view.getByRole('link', { name: 'OpenPost' })).toHaveAttribute(
      'href',
      'https://openpo.st',
    );
    await view.screenshot({
      animations: 'disabled',
      path: `${SCREENSHOTS}/popup-light.png`,
    });
    await view.emulateMedia({ colorScheme: 'dark' });
    await expect(view.locator('html')).toHaveAttribute(
      'data-theme-scheme',
      'dark',
    );
    const darkAccessibility = await new AxeBuilder({ page: view }).analyze();
    expect(darkAccessibility.violations).toEqual([]);
    await view.screenshot({
      animations: 'disabled',
      path: `${SCREENSHOTS}/popup-dark.png`,
    });
    const home = await context.newPage();
    await home.setViewportSize({ width: 1280, height: 900 });
    await home.goto('https://x.com/home');
    await expect(
      (await gateFrame(home)).getByRole('button', { name: 'Browse timeline' }),
    ).toBeVisible();
    await home.screenshot({
      animations: 'disabled',
      path: `${SCREENSHOTS}/desktop-light.png`,
    });
    await home.setViewportSize({ width: 390, height: 844 });
    await home.emulateMedia({ colorScheme: 'dark' });
    await expect((await gateFrame(home)).locator('html')).toHaveAttribute(
      'data-theme-scheme',
      'dark',
    );
    await home.screenshot({
      animations: 'disabled',
      path: `${SCREENSHOTS}/narrow-dark.png`,
    });
    expect(
      await home.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
    const now = Date.now();
    await view.evaluate(
      `chrome.storage.local.set({timelineWindow:{version:1,startedAt:${now - 300_000},endsAt:${now},nextAt:${now + 3_300_000}}})`,
    );
    await view.bringToFront();
    await expect(view.getByRole('heading', { name: 'Back in' })).toBeVisible();
    await expect(view.getByRole('link', { name: 'OpenPost' })).toBeVisible();
    await view.evaluate(
      () =>
        new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        ),
    );
    await view
      .getByRole('link', { name: 'OpenPost' })
      .screenshot({ path: `${SCREENSHOTS}/popup-locked-attribution.png` });
    await view.screenshot({
      path: `${SCREENSHOTS}/popup-locked-dark.png`,
    });
    await view.evaluate(
      'chrome.storage.local.set({timelineWindow:{version:9}})',
    );
    await expect(
      view.getByRole('heading', { name: 'Timer unavailable' }),
    ).toBeVisible();
    await expect(view.getByRole('button', { name: 'Retry' })).toBeVisible();
    await view.evaluate("chrome.storage.local.remove('timelineWindow')");
    await expect(
      view.getByRole('button', { name: 'Browse timeline' }),
    ).toBeVisible();
  } finally {
    await context.close();
    await rm(profile, { recursive: true, force: true });
  }
});
