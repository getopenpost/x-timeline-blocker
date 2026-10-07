import browser from 'webextension-polyfill';
import { requestTimer } from './client';
import {
  isHomeUrl,
  readWindow,
  statusAt,
  TIMER_KEY,
  type BrowseWindow,
} from './timer';
let windowState: BrowseWindow | null = null;
let available = false;
let currentTarget: HTMLElement | null = null;
let gate: HTMLElement | null = null;
let hadInert = false;
let previousDisplay = '';
let previousPriority = '';
let wasHidden: boolean | 'until-found' = false;
function restore() {
  if (currentTarget) {
    currentTarget.hidden = wasHidden;
    currentTarget.inert = hadInert;
    if (previousDisplay)
      currentTarget.style.setProperty(
        'display',
        previousDisplay,
        previousPriority,
      );
    else currentTarget.style.removeProperty('display');
    currentTarget = null;
  }
  gate?.remove();
  gate = null;
}
function hideTarget(target: HTMLElement) {
  if (!target.hidden) target.hidden = true;
  if (!target.inert) target.inert = true;
  if (
    target.style.getPropertyValue('display') !== 'none' ||
    target.style.getPropertyPriority('display') !== 'important'
  )
    target.style.setProperty('display', 'none', 'important');
}
function reconcile() {
  const shouldBlock =
    isHomeUrl(location.href) &&
    (!available || statusAt(windowState).phase !== 'active');
  if (!shouldBlock) {
    restore();
    return;
  }
  const target = document.querySelector<HTMLElement>(
    '[data-testid="primaryColumn"] section[role="region"]',
  );
  if (!target) {
    restore();
    return;
  }
  if (target === currentTarget && gate?.isConnected) {
    hideTarget(target);
    return;
  }
  restore();
  currentTarget = target;
  hadInert = target.inert;
  wasHidden = target.hidden;
  previousDisplay = target.style.getPropertyValue('display');
  previousPriority = target.style.getPropertyPriority('display');
  hideTarget(target);
  gate = document.createElement('div');
  gate.dataset.openpostTimelineGate = '';
  const shadow = gate.attachShadow({ mode: 'closed' });
  const frame = document.createElement('iframe');
  frame.src = browser.runtime.getURL('gate.html');
  frame.title = 'X Timeline Blocker';
  frame.style.cssText =
    'display:block;width:100%;height:340px;border:0;color-scheme:light dark;';
  shadow.append(frame);
  target.before(gate);
}
let refreshing = false;
async function refresh() {
  if (refreshing) return;
  refreshing = true;
  try {
    windowState = await requestTimer('status');
    available = true;
  } catch {
    available = false;
  }
  refreshing = false;
  reconcile();
}
browser.storage.onChanged.addListener((changes, area) => {
  if (area !== 'local' || !(TIMER_KEY in changes)) return;
  try {
    windowState = readWindow(changes[TIMER_KEY].newValue);
    available = true;
  } catch {
    available = false;
  }
  reconcile();
});
let scheduled = false;
const observer = new MutationObserver(() => {
  if (scheduled) return;
  scheduled = true;
  queueMicrotask(() => {
    scheduled = false;
    reconcile();
  });
});
observer.observe(document, {
  childList: true,
  subtree: true,
  attributes: true,
  attributeFilter: ['style', 'hidden', 'inert'],
});
setInterval(() => {
  reconcile();
  if (!available && isHomeUrl(location.href)) void refresh();
}, 500);
window.addEventListener('popstate', reconcile);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) void refresh();
});
void refresh();
