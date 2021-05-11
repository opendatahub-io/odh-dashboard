import { KubeFastifyInstance } from '../types';

export class ResourceWatcher<T> {
  readonly activeWatchInterval: number;
  readonly inactiveWatchInterval: number;

  private watchTimer: NodeJS.Timeout = undefined;
  private activeTimer: NodeJS.Timeout = undefined;
  private activelyWatching = false;

  private fastify: KubeFastifyInstance;
  private getter: (fastify: KubeFastifyInstance) => Promise<T[]>;
  private resources: T[] = [];

  constructor(
    fastify: KubeFastifyInstance,
    getter: (fastify: KubeFastifyInstance) => Promise<T[]>,
    activeWatchInterval: number = 2 * 60 * 1000,
    inactiveWatchInterval: number = 30 * 60 * 1000,
  ) {
    this.fastify = fastify;
    this.getter = getter;
    this.activeWatchInterval = activeWatchInterval;
    this.inactiveWatchInterval = inactiveWatchInterval;
    this.startWatching(false);
  }

  updateResults(): Promise<void> {
    return this.getter(this.fastify).then((results) => {
      this.resources = results;
    });
  }

  startWatching(active: boolean): void {
    if (this.watchTimer !== undefined) {
      if (active === this.activelyWatching) {
        return;
      }
      // Stop the current timer, and restart with new interval timeout based on activity
      this.stopWatching();
    }

    // no timer, but not undefined
    this.watchTimer = null;
    this.updateResults().then(() => {
      this.watchTimer = setInterval(
        () => {
          if (this.watchTimer) {
            // eslint-disable-next-line @typescript-eslint/no-empty-function
            this.updateResults().then(() => {});
          }
        },
        this.activelyWatching ? this.activeWatchInterval : this.inactiveWatchInterval,
      );
    });
  }

  stopWatching(): void {
    if (!this.watchTimer) {
      return;
    }
    clearInterval(this.watchTimer);
    this.watchTimer = undefined;
  }

  public getResources(): T[] {
    // Clear the timeout for actively watching
    if (this.activeTimer) {
      clearTimeout(this.activeTimer);
    }

    // Start watching actively
    this.startWatching(true);

    // Set a timeout to clear actively watching if we don't get called again within the timeout period
    this.activeTimer = setTimeout(() => {
      this.activelyWatching = false;
      this.startWatching(false);
    });

    return this.resources;
  }
}
