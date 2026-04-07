import { waitFor } from '@testing-library/react';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import { createSharedPollingStore } from '#~/utilities/createSharedPollingStore';

jest.useFakeTimers();

const POLL_INTERVAL = 5000;

type TestStatus = { value: number; loaded: boolean };

const INITIAL: TestStatus = { value: 0, loaded: false };
const DISABLED: TestStatus = { value: 0, loaded: true };

const createTestStore = (fetchFn: () => Promise<TestStatus>) =>
  createSharedPollingStore<TestStatus>({
    fetchFn,
    initialValue: INITIAL,
    disabledValue: DISABLED,
    pollInterval: POLL_INTERVAL,
  });

describe('createSharedPollingStore', () => {
  afterEach(() => {
    jest.clearAllTimers();
  });

  it('should return disabledValue when shouldFetch is false', () => {
    const fetchFn = jest.fn();
    const useStore = createTestStore(fetchFn);
    const renderResult = testHook(useStore)(false);

    expect(renderResult).hookToStrictEqual(DISABLED);
    expect(renderResult).hookToHaveUpdateCount(1);
    expect(fetchFn).not.toHaveBeenCalled();
  });

  it('should return initialValue before first fetch completes', () => {
    const fetchFn = jest.fn().mockReturnValue(new Promise(jest.fn()));
    const useStore = createTestStore(fetchFn);
    const renderResult = testHook(useStore)(true);

    expect(renderResult).hookToStrictEqual(INITIAL);
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should return fetched value after first fetch', async () => {
    const fetchFn = jest.fn().mockResolvedValue({ value: 42, loaded: true });
    const useStore = createTestStore(fetchFn);
    const renderResult = testHook(useStore)(true);

    await waitFor(() => {
      expect(renderResult.result.current).toStrictEqual({ value: 42, loaded: true });
    });

    expect(fetchFn).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should share a single fetch across multiple subscribers', async () => {
    const fetchFn = jest.fn().mockResolvedValue({ value: 1, loaded: true });
    const useStore = createTestStore(fetchFn);

    const first = testHook(useStore)(true);
    const second = testHook(useStore)(true);

    await waitFor(() => {
      expect(first.result.current).toStrictEqual({ value: 1, loaded: true });
      expect(second.result.current).toStrictEqual({ value: 1, loaded: true });
    });

    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('should poll at the configured interval', async () => {
    const fetchFn = jest.fn().mockResolvedValue({ value: 1, loaded: true });
    const useStore = createTestStore(fetchFn);
    testHook(useStore)(true);

    await waitFor(() => {
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    jest.advanceTimersByTime(POLL_INTERVAL);
    await waitFor(() => {
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    jest.advanceTimersByTime(POLL_INTERVAL);
    await waitFor(() => {
      expect(fetchFn).toHaveBeenCalledTimes(3);
    });
  });

  it('should start fetching when shouldFetch transitions to true', async () => {
    const fetchFn = jest.fn().mockResolvedValue({ value: 7, loaded: true });
    const useStore = createTestStore(fetchFn);

    const renderResult = testHook(useStore)(false);
    expect(renderResult).hookToStrictEqual(DISABLED);
    expect(fetchFn).not.toHaveBeenCalled();

    renderResult.rerender(true);

    await waitFor(() => {
      expect(renderResult.result.current).toStrictEqual({ value: 7, loaded: true });
    });

    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('should call onError and update cache on fetch failure', async () => {
    const fetchFn = jest.fn().mockRejectedValue(new Error('fail'));
    const useStore = createSharedPollingStore<TestStatus>({
      fetchFn,
      initialValue: INITIAL,
      disabledValue: DISABLED,
      pollInterval: POLL_INTERVAL,
      onError: () => ({ value: -1, loaded: true }),
    });

    const renderResult = testHook(useStore)(true);

    await waitFor(() => {
      expect(renderResult.result.current).toStrictEqual({ value: -1, loaded: true });
    });
  });

  it('should keep previous value when fetch throws and onError is not provided', async () => {
    let callCount = 0;
    const fetchFn = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({ value: 10, loaded: true });
      }
      return Promise.reject(new Error('fail'));
    });
    const useStore = createTestStore(fetchFn);
    const renderResult = testHook(useStore)(true);

    await waitFor(() => {
      expect(renderResult.result.current).toStrictEqual({ value: 10, loaded: true });
    });

    jest.advanceTimersByTime(POLL_INTERVAL);
    await waitFor(() => {
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    expect(renderResult.result.current).toStrictEqual({ value: 10, loaded: true });
  });

  it('should recover on next poll after a failure', async () => {
    const fetchFn = jest.fn().mockRejectedValueOnce(new Error('fail'));
    const useStore = createSharedPollingStore<TestStatus>({
      fetchFn,
      initialValue: INITIAL,
      disabledValue: DISABLED,
      pollInterval: POLL_INTERVAL,
      onError: () => ({ value: -1, loaded: true }),
    });

    const renderResult = testHook(useStore)(true);

    await waitFor(() => {
      expect(renderResult.result.current).toStrictEqual({ value: -1, loaded: true });
    });

    fetchFn.mockResolvedValueOnce({ value: 99, loaded: true });
    jest.advanceTimersByTime(POLL_INTERVAL);

    await waitFor(() => {
      expect(renderResult.result.current).toStrictEqual({ value: 99, loaded: true });
    });
  });

  it('should not re-notify listeners when fetched value is unchanged', async () => {
    const stable = { value: 1, loaded: true };
    const fetchFn = jest.fn().mockResolvedValue(stable);
    const useStore = createTestStore(fetchFn);
    const renderResult = testHook(useStore)(true);

    await waitFor(() => {
      expect(renderResult.result.current).toStrictEqual(stable);
    });

    expect(renderResult).hookToHaveUpdateCount(2);

    jest.advanceTimersByTime(POLL_INTERVAL);
    await waitFor(() => {
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should support custom isEqual', async () => {
    let callCount = 0;
    const fetchFn = jest.fn().mockImplementation(() => {
      callCount++;
      return Promise.resolve({ value: callCount, loaded: true });
    });

    const useStore = createSharedPollingStore<TestStatus>({
      fetchFn,
      initialValue: INITIAL,
      disabledValue: DISABLED,
      pollInterval: POLL_INTERVAL,
      isEqual: (a, b) => a.loaded === b.loaded,
    });

    const renderResult = testHook(useStore)(true);

    await waitFor(() => {
      expect(renderResult.result.current).toStrictEqual({ value: 1, loaded: true });
    });

    expect(renderResult).hookToHaveUpdateCount(2);

    jest.advanceTimersByTime(POLL_INTERVAL);
    await waitFor(() => {
      expect(fetchFn).toHaveBeenCalledTimes(2);
    });

    // value changed (1 → 2) but isEqual only checks loaded, so no re-render
    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should discard orphaned fetch when all subscribers leave before it resolves', async () => {
    let resolveFetch: (v: TestStatus) => void = jest.fn();
    const fetchFn = jest.fn().mockImplementation(
      () =>
        new Promise<TestStatus>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const useStore = createTestStore(fetchFn);

    const renderResult = testHook(useStore)(true);
    expect(renderResult).hookToStrictEqual(INITIAL);

    // Unsubscribe while the first fetch is still in-flight
    renderResult.rerender(false);
    expect(renderResult).hookToStrictEqual(DISABLED);

    // The orphaned fetch resolves — should be discarded
    resolveFetch({ value: 99, loaded: true });
    await waitFor(() => {
      expect(fetchFn).toHaveBeenCalledTimes(1);
    });

    // Re-subscribe: should see initialValue, not the stale { value: 99 }
    fetchFn.mockImplementation(() => new Promise(jest.fn()));
    renderResult.rerender(true);
    expect(renderResult.result.current).toStrictEqual(INITIAL);
  });

  it('should call onReset when the last subscriber leaves', async () => {
    const fetchFn = jest.fn().mockResolvedValue({ value: 1, loaded: true });
    const onReset = jest.fn();
    const useStore = createSharedPollingStore<TestStatus>({
      fetchFn,
      initialValue: INITIAL,
      disabledValue: DISABLED,
      pollInterval: POLL_INTERVAL,
      onReset,
    });

    const renderResult = testHook(useStore)(true);
    await waitFor(() => {
      expect(renderResult.result.current).toStrictEqual({ value: 1, loaded: true });
    });

    expect(onReset).not.toHaveBeenCalled();

    renderResult.rerender(false);
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it('should keep cache warm during teardownGracePeriod', async () => {
    const fetchFn = jest.fn().mockResolvedValue({ value: 1, loaded: true });
    const GRACE_MS = 500;
    const useStore = createSharedPollingStore<TestStatus>({
      fetchFn,
      initialValue: INITIAL,
      disabledValue: DISABLED,
      pollInterval: POLL_INTERVAL,
      teardownGracePeriod: GRACE_MS,
    });

    const renderResult = testHook(useStore)(true);
    await waitFor(() => {
      expect(renderResult.result.current).toStrictEqual({ value: 1, loaded: true });
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);

    // Unsubscribe — grace period starts, cache stays warm
    renderResult.rerender(false);

    // Re-subscribe within grace period — should get cached value, no new fetch
    renderResult.rerender(true);
    expect(renderResult.result.current).toStrictEqual({ value: 1, loaded: true });
    expect(fetchFn).toHaveBeenCalledTimes(1);
  });

  it('should reset cache after teardownGracePeriod expires', async () => {
    const fetchFn = jest.fn().mockResolvedValue({ value: 1, loaded: true });
    const onReset = jest.fn();
    const GRACE_MS = 500;
    const useStore = createSharedPollingStore<TestStatus>({
      fetchFn,
      initialValue: INITIAL,
      disabledValue: DISABLED,
      pollInterval: POLL_INTERVAL,
      teardownGracePeriod: GRACE_MS,
      onReset,
    });

    const renderResult = testHook(useStore)(true);
    await waitFor(() => {
      expect(renderResult.result.current).toStrictEqual({ value: 1, loaded: true });
    });

    // Unsubscribe — grace period starts
    renderResult.rerender(false);
    expect(onReset).not.toHaveBeenCalled();

    // Let grace period expire
    jest.advanceTimersByTime(GRACE_MS);
    expect(onReset).toHaveBeenCalledTimes(1);

    // Re-subscribe after grace expired — should start from initialValue and re-fetch
    fetchFn.mockResolvedValue({ value: 2, loaded: true });
    renderResult.rerender(true);
    expect(renderResult.result.current).toStrictEqual(INITIAL);

    await waitFor(() => {
      expect(renderResult.result.current).toStrictEqual({ value: 2, loaded: true });
    });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('should trigger an immediate fetch when refresh() is called with active subscribers', async () => {
    const fetchFn = jest.fn().mockResolvedValue({ value: 1, loaded: true });
    const useStore = createSharedPollingStore<TestStatus>({
      fetchFn,
      initialValue: INITIAL,
      disabledValue: DISABLED,
      pollInterval: POLL_INTERVAL,
    });

    const renderResult = testHook(useStore)(true);
    await waitFor(() => {
      expect(renderResult.result.current).toStrictEqual({ value: 1, loaded: true });
    });
    expect(fetchFn).toHaveBeenCalledTimes(1);

    fetchFn.mockResolvedValue({ value: 42, loaded: true });
    useStore.refresh();

    await waitFor(() => {
      expect(renderResult.result.current).toStrictEqual({ value: 42, loaded: true });
    });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('should be a no-op when refresh() is called with no active subscribers', () => {
    const fetchFn = jest.fn().mockResolvedValue({ value: 1, loaded: true });
    const useStore = createSharedPollingStore<TestStatus>({
      fetchFn,
      initialValue: INITIAL,
      disabledValue: DISABLED,
      pollInterval: POLL_INTERVAL,
    });

    useStore.refresh();
    expect(fetchFn).not.toHaveBeenCalled();
  });
});
