import browser from 'webextension-polyfill';
import { readWindow, type BrowseWindow } from './timer';
export async function requestTimer(
  type: 'status' | 'grant',
): Promise<BrowseWindow | null> {
  const reply: unknown = await browser.runtime.sendMessage({ type });
  if (
    !reply ||
    typeof reply !== 'object' ||
    !('ok' in reply) ||
    reply.ok !== true ||
    !('window' in reply)
  ) {
    throw new Error('Timer unavailable');
  }
  return readWindow(reply.window);
}
