import { afterEach, describe, expect, it, vi } from 'vitest';
import { TimerCoordinator } from '../../src/coordinator';
import { readWindow, statusAt, isHomeUrl } from '../../src/timer';
class MemoryStorage {
  values: Record<string, unknown> = {};
  writes = 0;
  async get() {
    await Promise.resolve();
    return structuredClone(this.values);
  }
  async set(value: Record<string, unknown>) {
    await Promise.resolve();
    this.values = structuredClone(value);
    this.writes++;
  }
}
afterEach(() => vi.useRealTimers());
describe('shared browse window', () => {
  it('serializes simultaneous grants and preserves the first five minutes across coordinator restarts', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(2_000_000);
    const storage = new MemoryStorage();
    const timer = new TimerCoordinator(storage);
    const windows = await Promise.all(
      Array.from({ length: 12 }, () => timer.grant()),
    );
    expect(windows.every((state) => state.phase === 'active')).toBe(true);
    expect(storage.writes).toBe(1);
    expect((await timer.status()).window).toEqual({
      version: 1,
      startedAt: 2_000_000,
      endsAt: 2_300_000,
      nextAt: 5_600_000,
    });
    vi.setSystemTime(2_299_999);
    const restarted = new TimerCoordinator(storage);
    expect(await restarted.status()).toMatchObject({
      phase: 'active',
      remainingMs: 1,
    });
    vi.setSystemTime(2_300_000);
    expect(await restarted.grant()).toMatchObject({
      phase: 'locked',
      remainingMs: 3_300_000,
    });
    expect(storage.writes).toBe(1);
    vi.setSystemTime(5_600_000);
    expect(await restarted.status()).toMatchObject({
      phase: 'ready',
      remainingMs: 300_000,
    });
    expect((await restarted.grant()).window?.startedAt).toBe(5_600_000);
    expect(storage.writes).toBe(2);
  });
  it('fails closed on damaged persisted data and can recover after storage is repaired', async () => {
    const storage = new MemoryStorage();
    storage.values.timelineWindow = {
      version: 1,
      startedAt: 10,
      endsAt: 11,
      nextAt: 12,
    };
    const timer = new TimerCoordinator(storage);
    await expect(timer.grant()).rejects.toThrow('Invalid timer');
    expect(storage.writes).toBe(0);
    storage.values = {};
    expect((await timer.grant()).phase).toBe('active');
  });
  it('does not reopen a window when the system clock moves before its grant', () => {
    expect(
      statusAt(
        readWindow({
          version: 1,
          startedAt: 2_000_000,
          endsAt: 2_300_000,
          nextAt: 5_600_000,
        }),
        1_000_000,
      ).phase,
    ).toBe('locked');
  });
});
it.each([
  ['https://x.com/home', true],
  ['https://twitter.com/home?lang=en', true],
  ['https://x.com/', true],
  ['https://x.com/messages', false],
  ['https://x.com/notifications', false],
  ['https://x.com/compose/post', false],
  ['https://x.com/i/bookmarks', false],
  ['https://x.com/rodrigo', false],
  ['https://x.com/rodrigo/status/123', false],
  ['https://x.com.evil.example/home', false],
  ['http://x.com/home', false],
  ['invalid', false],
])('gates only the home URL %s', (url, blocked) =>
  expect(isHomeUrl(url)).toBe(blocked),
);
