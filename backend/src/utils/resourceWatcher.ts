import { KubeFastifyInstance } from '../types';

export const DEFAULT_ACTIVE_TIMEOUT: number = 2 * 60 * 1000;
export const DEFAULT_INACTIVE_TIMEOUT: number = 30 * 60 * 1000;

export const ACTIVITY_TIMEOUT: number = 2 * 60 * 1000;

export type ResourceWatcherTimeUpdate = {
  activeWatchInterval?: number;
  inactiveWatchInterval?: number;
};

export class ResourceWatcher<T> {
  readonly fastify: KubeFastifyInstance;
  readonly getter: (fastify: KubeFastifyInstance) => Promise<T[]>;
  readonly getTimesForResults: (results: T[]) => ResourceWatcherTimeUpdate;
  private activeWatchInterval: number;
  private inactiveWatchInterval: number;

  private watchTimer: NodeJS.Timeout = undefined;
  private activeTimer: NodeJS.Timeout = undefined;
  private activelyWatching = false;

  private resources: T[] = [];

  constructor(
    fastify: KubeFastifyInstance,
    getter: (fastify: KubeFastifyInstance) => Promise<T[]>,
    getTimesForResults: (results: T[]) => ResourceWatcherTimeUpdate = undefined,
    activeWatchInterval: number = DEFAULT_ACTIVE_TIMEOUT,
    inactiveWatchInterval: number = DEFAULT_INACTIVE_TIMEOUT,
  ) {
    this.fastify = fastify;
    this.getter = getter;
    this.getTimesForResults = getTimesForResults;
    this.activeWatchInterval = activeWatchInterval;
    this.inactiveWatchInterval = inactiveWatchInterval;
    this.startWatching(false);
  }

  updateResults(): Promise<void> {
    return this.getter(this.fastify).then((results) => {
      this.resources = results;
    });
  }

  updateRefreshTime(): boolean {
    let updated = false;
    if (this.getTimesForResults) {
      const { activeWatchInterval, inactiveWatchInterval } = this.getTimesForResults(
        this.resources,
      );
      if (activeWatchInterval !== this.activeWatchInterval) {
        this.activeWatchInterval = activeWatchInterval;
        if (this.activelyWatching) {
          updated = true;
        }
      }
      if (inactiveWatchInterval !== this.inactiveWatchInterval) {
        this.inactiveWatchInterval = inactiveWatchInterval;
        if (!this.activelyWatching) {
          updated = true;
        }
      }
    }
    return updated;
  }

  startWatching(active: boolean): void {
    // if still starting up, wait for initial results
    if (this.watchTimer === null) {
      if (active) {
        this.activelyWatching = true;
      }
      return;
    }

    if (this.watchTimer !== undefined) {
      if (active === this.activelyWatching) {
        return;
      }
      // Stop the current timer, and restart with new interval timeout based on activity
      this.stopWatching();
    }
    this.activelyWatching = active;
    // no timer, but not undefined
    this.watchTimer = null;
    this.updateResults()
      .catch(() => {
        // Swallow any exceptions
      })
      .finally(() => {
        if (this.watchTimer) {
          return;
        }
        this.watchTimer = setInterval(
          () => {
            if (this.watchTimer) {
              this.updateResults()
                .then(() => {
                  if (this.updateRefreshTime()) {
                    this.stopWatching();
                    this.startWatching(this.activelyWatching);
                  }
                })
                .catch(() => {
                  // swallow any exceptions
                });
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
    }, ACTIVITY_TIMEOUT);

    return this.resources;
  }
}
