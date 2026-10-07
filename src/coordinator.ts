import {
  BROWSE_MS,
  PERIOD_MS,
  TIMER_KEY,
  readWindow,
  statusAt,
  type TimerStatus,
} from './timer';
interface TimerStorage {
  get(key: string): Promise<Record<string, unknown>>;
  set(value: Record<string, unknown>): Promise<void>;
}
export class TimerCoordinator {
  #queue: Promise<unknown> = Promise.resolve();
  constructor(private readonly storage: TimerStorage) {}
  async status(): Promise<TimerStatus> {
    const values = await this.storage.get(TIMER_KEY);
    return statusAt(readWindow(values[TIMER_KEY]));
  }
  grant(): Promise<TimerStatus> {
    const run = this.#queue.then(async () => {
      const current = await this.status();
      if (current.phase !== 'ready') return current;
      const now = Date.now();
      const window = {
        version: 1 as const,
        startedAt: now,
        endsAt: now + BROWSE_MS,
        nextAt: now + PERIOD_MS,
      };
      await this.storage.set({ [TIMER_KEY]: window });
      return statusAt(window);
    });
    this.#queue = run.catch(() => undefined);
    return run;
  }
}
