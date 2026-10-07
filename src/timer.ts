export const BROWSE_MS = 5 * 60 * 1000;
export const PERIOD_MS = 60 * 60 * 1000;
export const TIMER_KEY = 'timelineWindow';
export interface BrowseWindow {
  version: 1;
  startedAt: number;
  endsAt: number;
  nextAt: number;
}
export interface TimerStatus {
  window: BrowseWindow | null;
  phase: 'ready' | 'active' | 'locked';
  remainingMs: number;
}
export function readWindow(value: unknown): BrowseWindow | null {
  if (value === undefined || value === null) return null;
  if (typeof value !== 'object' || Array.isArray(value))
    throw new Error('Invalid timer');
  const state = value as Record<string, unknown>;
  if (
    state.version !== 1 ||
    typeof state.startedAt !== 'number' ||
    !Number.isSafeInteger(state.startedAt) ||
    state.startedAt < 0 ||
    !Number.isSafeInteger(state.endsAt) ||
    !Number.isSafeInteger(state.nextAt) ||
    state.endsAt !== state.startedAt + BROWSE_MS ||
    state.nextAt !== state.startedAt + PERIOD_MS
  )
    throw new Error('Invalid timer');
  return {
    version: 1,
    startedAt: state.startedAt,
    endsAt: state.endsAt as number,
    nextAt: state.nextAt as number,
  };
}
export function statusAt(
  window: BrowseWindow | null,
  now = Date.now(),
): TimerStatus {
  if (!window || now >= window.nextAt)
    return { window, phase: 'ready', remainingMs: BROWSE_MS };
  if (now >= window.startedAt && now < window.endsAt)
    return { window, phase: 'active', remainingMs: window.endsAt - now };
  return { window, phase: 'locked', remainingMs: window.nextAt - now };
}
export function isHomeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      ['x.com', 'twitter.com'].includes(parsed.hostname) &&
      ['/', '/home', '/home/'].includes(parsed.pathname)
    );
  } catch {
    return false;
  }
}
export function formatCountdown(ms: number): string {
  const seconds = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
}
