import { test, expect } from '@playwright/test';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { launchFirefox } from './firefox';
import { gateFrame } from './fixture';
test('Firefox MV3 packaged timer, gate and cross-tab grant run through background scripts', async () => {
  const profile = await mkdtemp(join(tmpdir(), 'x-blocker-firefox-'));
  const context = await launchFirefox(profile);
  try {
    const first = await context.newPage();
    const second = await context.newPage();
    await first.goto('https://x.com/home');
    await second.goto('https://twitter.com/home');
    await expect(first.getByRole('article').first()).toBeHidden();
    await expect(second.getByRole('article').first()).toBeHidden();
    const gate = await gateFrame(first);
    await expect(
      gate.getByRole('button', { name: 'Browse timeline' }),
    ).toBeVisible();

    const control = await context.newPage();
    await control.goto('https://x.com/messages');
    await control.evaluate((url) => {
      const frame = document.createElement('iframe');
      frame.src = url;
      frame.title = 'Timer';
      document.body.append(frame);
    }, gate.url());
    const timerView = control.frameLocator('iframe');
    await expect(
      timerView.getByRole('button', { name: 'Browse timeline' }),
    ).toBeVisible();
    await gate.getByRole('button', { name: 'Browse timeline' }).click();
    await expect(first.getByRole('article').first()).toBeVisible();
    await expect(second.getByRole('article').first()).toBeVisible();

    await expect(
      timerView.getByRole('heading', { name: 'Time left' }),
    ).toBeVisible();
    await control.locator('iframe').evaluate((frame) => {
      (frame as HTMLIFrameElement).src = (frame as HTMLIFrameElement).src;
    });
    await expect(
      timerView.getByRole('heading', { name: 'Time left' }),
    ).toBeVisible();
    const now = Date.now();
    await control
      .frames()
      .find((frame) => frame.url().endsWith('/gate.html'))!
      .evaluate(
        `browser.storage.local.set({timelineWindow:{version:1,startedAt:${now - 300_000},endsAt:${now},nextAt:${now + 3_300_000}}})`,
      );
    await expect(
      timerView.getByRole('heading', { name: 'Back in' }),
    ).toBeVisible();
    await expect(first.getByRole('article').first()).toBeHidden();
    await first.getByRole('link', { name: 'Messages', exact: true }).click();
    await expect(first.locator('#allowed')).toBeVisible();
    await expect(first.locator('[data-openpost-timeline-gate]')).toHaveCount(0);
  } finally {
    await context.close();
    await rm(profile, { recursive: true, force: true });
  }
});
