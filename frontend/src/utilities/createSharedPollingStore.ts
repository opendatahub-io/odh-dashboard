import * as React from 'react';
import { isEqual } from 'lodash-es';

export type SharedPollingStoreHook<T> = ((shouldFetch: boolean) => T) & {
  /** Trigger an immediate re-fetch. No-op when no subscribers are active or a fetch is in flight. */
  refresh: () => void;
};

type SharedPollingStoreOptions<T> = {
  /** Async function that fetches the latest value from the remote source. */
  fetchFn: () => Promise<T>;
  /** Value returned before the first successful fetch completes. */
  initialValue: T;
  /** Value returned when the hook is called with `shouldFetch = false`. */
  disabledValue: T;
  /** Interval in ms between polling fetches while at least one subscriber exists. */
  pollInterval: number;
  /** Delay in ms before resetting the cache after the last subscriber leaves.
   *  Keeps the cache warm across route transitions (default: 0 — immediate reset). */
  teardownGracePeriod?: number;
  /** Called when `fetchFn` rejects. Returns a fallback value to store in the cache. */
  onError?: (error: unknown, previous: T) => T;
  /** Called when the cache is fully torn down (after grace period, if any). */
  onReset?: () => void;
  /** Custom equality check to avoid notifying subscribers on identical values (default: `lodash-es/isEqual`). */
  isEqual?: (a: T, b: T) => boolean;
};

/**
 * Creates a hook backed by a module-scoped polling store.
 *
 * All instances of the returned hook share a single polling loop:
 * - The first subscriber triggers an immediate fetch and starts the interval.
 * - Additional subscribers receive the cached value without extra requests.
 * - When the last subscriber unmounts, the cache is kept warm for
 *   `teardownGracePeriod` ms (default 0). If a new subscriber appears within
 *   that window (e.g. during a route transition), it receives the cached value
 *   with no extra fetch. If the grace period expires, the interval is stopped
 *   and the cache is reset to `initialValue`.
 *
 * The returned hook accepts a `shouldFetch` boolean:
 * - `true`  → subscribes to the shared store (starts polling if first).
 * - `false` → returns `disabledValue` without subscribing.
 *
 * The returned hook also exposes a `refresh()` method that triggers an
 * immediate re-fetch (e.g. after a mutation). It is a no-op when no
 * subscribers are active or a fetch is already in flight.
 *
 * @example
 * export const useServiceStatus = createSharedPollingStore<ServiceStatus>({
 *   fetchFn: async () => {
 *     const { data } = await axios.get<{ ready: boolean }>('/api/status');
 *     return { ready: data.ready, loaded: true };
 *   },
 *   initialValue: { ready: false, loaded: false },
 *   disabledValue: { ready: false, loaded: true },
 *   pollInterval: 30_000,
 * });
 */
export const createSharedPollingStore = <T>({
  fetchFn,
  initialValue,
  disabledValue,
  pollInterval,
  teardownGracePeriod = 0,
  onError,
  onReset,
  isEqual: isEqualFn = isEqual,
}: SharedPollingStoreOptions<T>): SharedPollingStoreHook<T> => {
  let cache: T = initialValue;
  let subscriberCount = 0;
  let pollTimer: ReturnType<typeof setInterval> | null = null;
  let teardownTimer: ReturnType<typeof setTimeout> | null = null;
  let fetchInFlight = false;
  let generation = 0;
  const listeners = new Set<() => void>();

  const notifyListeners = (): void => {
    listeners.forEach((l) => l());
  };

  const updateCache = (next: T): void => {
    if (!isEqualFn(cache, next)) {
      cache = next;
      notifyListeners();
    }
  };

  // fetchInFlight is intentionally only reset when gen === generation.
  // On generation mismatch the unsubscribe handler has already reset it
  // to false (synchronously, before any re-subscribe).
  const fetchAndUpdate = async (): Promise<void> => {
    if (fetchInFlight) {
      return;
    }
    fetchInFlight = true;
    const gen = generation;
    try {
      const result = await fetchFn();
      if (gen !== generation) {
        return;
      }
      updateCache(result);
    } catch (e) {
      if (gen !== generation) {
        return;
      }
      if (onError) {
        updateCache(onError(e, cache));
      }
    } finally {
      if (gen === generation) {
        fetchInFlight = false;
      }
    }
  };

  const teardown = (): void => {
    if (pollTimer != null) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
    teardownTimer = null;
    cache = initialValue;
    fetchInFlight = false;
    generation++;
    onReset?.();
  };

  const subscribe = (onStoreChange: () => void): (() => void) => {
    listeners.add(onStoreChange);
    subscriberCount++;

    if (teardownTimer != null) {
      clearTimeout(teardownTimer);
      teardownTimer = null;
    }

    if (subscriberCount === 1 && pollTimer == null) {
      fetchAndUpdate();
      pollTimer = setInterval(fetchAndUpdate, pollInterval);
    }

    return () => {
      listeners.delete(onStoreChange);
      subscriberCount--;
      if (subscriberCount === 0 && pollTimer != null) {
        if (teardownGracePeriod > 0) {
          teardownTimer = setTimeout(teardown, teardownGracePeriod);
        } else {
          teardown();
        }
      }
    };
  };

  const getSnapshot = (): T => cache;
  const noopSubscribe: typeof subscribe = () => () => undefined;
  const getDisabledSnapshot = (): T => disabledValue;

  const useStore = (shouldFetch: boolean): T =>
    React.useSyncExternalStore(
      shouldFetch ? subscribe : noopSubscribe,
      shouldFetch ? getSnapshot : getDisabledSnapshot,
    );

  useStore.refresh = (): void => {
    if (subscriberCount > 0) {
      fetchAndUpdate();
    }
  };

  return useStore;
};
