import browser from 'webextension-polyfill';
import { TimerCoordinator } from './coordinator';
import { isHomeUrl } from './timer';
const timer = new TimerCoordinator(browser.storage.local);
const ALARM_NAME = 'timeline-transition';
async function updateBadge() {
  const status = await timer.status();
  await browser.action.setBadgeText({
    text: status.phase === 'active' ? '5m' : '',
  });
  await browser.alarms.clear(ALARM_NAME);
  const when =
    status.phase === 'active'
      ? status.window!.endsAt
      : status.phase === 'locked'
        ? status.window!.nextAt
        : null;
  if (when !== null) await browser.alarms.create(ALARM_NAME, { when });
}
browser.runtime.onMessage.addListener(
  (message: unknown, sender: browser.Runtime.MessageSender) => {
    if (
      sender.id !== browser.runtime.id ||
      !sender.url ||
      !(
        sender.url.startsWith(browser.runtime.getURL('')) ||
        isHomeUrl(sender.url)
      )
    )
      return;
    if (
      !message ||
      typeof message !== 'object' ||
      !('type' in message) ||
      !['status', 'grant'].includes(String(message.type)) ||
      Object.keys(message).length !== 1
    )
      return;
    return (async () => {
      try {
        const status =
          message.type === 'grant' ? await timer.grant() : await timer.status();
        await updateBadge();
        return { ok: true, window: status.window };
      } catch {
        return { ok: false };
      }
    })();
  },
);
browser.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) void updateBadge().catch(() => undefined);
});
browser.runtime.onStartup.addListener(
  () => void updateBadge().catch(() => undefined),
);
browser.runtime.onInstalled.addListener(
  () => void updateBadge().catch(() => undefined),
);
