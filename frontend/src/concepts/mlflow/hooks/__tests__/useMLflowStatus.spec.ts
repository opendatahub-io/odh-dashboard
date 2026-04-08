import { waitFor } from '@testing-library/react';
import { testHook } from '@odh-dashboard/jest-config/hooks';
import { MLflowStatus } from '#~/concepts/mlflow/hooks/useMLflowStatus';

jest.useFakeTimers();

const STATUS_ENDPOINT = '/_bff/mlflow/api/v1/status';
const POLL_INTERVAL = 30000;

const actualReact = jest.requireActual('react');

// useMLflowStatus uses createSharedPollingStore which keeps module-scoped
// state (cache, subscribers, generation counter). Each test needs a fresh
// module instance so that state from one test doesn't leak into the next.
const loadFreshModule = () => {
  jest.resetModules();
  jest.doMock('react', () => actualReact);
  jest.doMock('#~/utilities/axios', () => ({
    get: jest.fn(),
  }));
  jest.doMock('#~/utilities/const', () => ({
    POLL_INTERVAL,
  }));

  const axios = require('#~/utilities/axios');
  const mod = require('#~/concepts/mlflow/hooks/useMLflowStatus');

  return {
    useMLflowStatus: mod.useMLflowStatus as (shouldFetch: boolean) => MLflowStatus,
    mockAxiosGet: axios.get as jest.Mock,
  };
};

describe('useMLflowStatus', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation();
    jest.spyOn(console, 'info').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.restoreAllMocks();
  });

  it('should return configured:false and loaded:true when shouldFetch is false', () => {
    const { useMLflowStatus, mockAxiosGet } = loadFreshModule();
    const renderResult = testHook(useMLflowStatus)(false);
    expect(renderResult).hookToStrictEqual({ configured: false, loaded: true });
    expect(renderResult).hookToHaveUpdateCount(1);
    expect(mockAxiosGet).not.toHaveBeenCalled();
  });

  it('should return configured:false and loaded:false while fetch is pending', () => {
    const { useMLflowStatus, mockAxiosGet } = loadFreshModule();
    mockAxiosGet.mockReturnValue(new Promise(jest.fn()));
    const renderResult = testHook(useMLflowStatus)(true);
    expect(renderResult).hookToStrictEqual({ configured: false, loaded: false });
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should return configured:true and loaded:true when API reports configured', async () => {
    const { useMLflowStatus, mockAxiosGet } = loadFreshModule();
    mockAxiosGet.mockResolvedValue({ data: { configured: true } });
    const renderResult = testHook(useMLflowStatus)(true);

    await waitFor(() => {
      expect(renderResult.result.current).toStrictEqual({ configured: true, loaded: true });
    });

    expect(mockAxiosGet).toHaveBeenCalledTimes(1);
    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should return configured:false and loaded:true when API reports not configured', async () => {
    const { useMLflowStatus, mockAxiosGet } = loadFreshModule();
    mockAxiosGet.mockResolvedValue({ data: { configured: false } });
    const renderResult = testHook(useMLflowStatus)(true);

    await waitFor(() => {
      expect(renderResult.result.current).toStrictEqual({ configured: false, loaded: true });
    });

    expect(renderResult).hookToHaveUpdateCount(2);
  });

  it('should preserve previous value when API call fails', async () => {
    const { useMLflowStatus, mockAxiosGet } = loadFreshModule();
    mockAxiosGet.mockRejectedValue(new Error('Network error'));
    const renderResult = testHook(useMLflowStatus)(true);

    // First fetch fails — stays at initialValue (no state change, so no extra render)
    await waitFor(() => {
      expect(mockAxiosGet).toHaveBeenCalledTimes(1);
    });
    expect(renderResult.result.current).toStrictEqual({ configured: false, loaded: false });
    expect(renderResult).hookToHaveUpdateCount(1);
  });

  it('should keep last successful value on transient error', async () => {
    const { useMLflowStatus, mockAxiosGet } = loadFreshModule();
    mockAxiosGet.mockResolvedValueOnce({ data: { configured: true } });

    const renderResult = testHook(useMLflowStatus)(true);
    await waitFor(() => {
      expect(renderResult.result.current).toStrictEqual({ configured: true, loaded: true });
    });

    // Next poll fails — should retain previous successful value
    mockAxiosGet.mockRejectedValueOnce(new Error('Network error'));
    jest.advanceTimersByTime(POLL_INTERVAL);
    await waitFor(() => {
      expect(mockAxiosGet).toHaveBeenCalledTimes(2);
    });
    expect(renderResult.result.current).toStrictEqual({ configured: true, loaded: true });
  });

  it('should call the correct status endpoint', async () => {
    const { useMLflowStatus, mockAxiosGet } = loadFreshModule();
    mockAxiosGet.mockResolvedValue({ data: { configured: true } });
    testHook(useMLflowStatus)(true);

    await waitFor(() => {
      expect(mockAxiosGet).toHaveBeenCalledWith(STATUS_ENDPOINT);
    });
  });

  it('should share a single fetch for multiple hook instances', async () => {
    const { useMLflowStatus, mockAxiosGet } = loadFreshModule();
    mockAxiosGet.mockResolvedValue({ data: { configured: true } });

    const renderResult = testHook(useMLflowStatus)(true);
    const secondRenderResult = testHook(useMLflowStatus)(true);

    await waitFor(() => {
      expect(renderResult.result.current).toStrictEqual({ configured: true, loaded: true });
      expect(secondRenderResult.result.current).toStrictEqual({ configured: true, loaded: true });
    });

    expect(mockAxiosGet).toHaveBeenCalledTimes(1);
  });

  it('should serve cached value to a late subscriber without an extra fetch', async () => {
    const { useMLflowStatus, mockAxiosGet } = loadFreshModule();
    mockAxiosGet.mockResolvedValue({ data: { configured: true } });

    const first = testHook(useMLflowStatus)(true);
    await waitFor(() => {
      expect(first.result.current).toStrictEqual({ configured: true, loaded: true });
    });
    expect(mockAxiosGet).toHaveBeenCalledTimes(1);

    // A second subscriber mounting later gets the cached value immediately
    const second = testHook(useMLflowStatus)(true);
    expect(second.result.current).toStrictEqual({ configured: true, loaded: true });
    expect(mockAxiosGet).toHaveBeenCalledTimes(1);
  });

  it('should keep cache warm during teardown grace period', async () => {
    const { useMLflowStatus, mockAxiosGet } = loadFreshModule();
    mockAxiosGet.mockResolvedValue({ data: { configured: true } });

    const renderResult = testHook(useMLflowStatus)(true);
    await waitFor(() => {
      expect(renderResult.result.current).toStrictEqual({ configured: true, loaded: true });
    });
    expect(mockAxiosGet).toHaveBeenCalledTimes(1);

    // Unsubscribe — grace period starts, cache stays warm
    renderResult.rerender(false);

    // Re-subscribe within grace period — cached value, no new fetch
    renderResult.rerender(true);
    expect(renderResult.result.current).toStrictEqual({ configured: true, loaded: true });
    expect(mockAxiosGet).toHaveBeenCalledTimes(1);
  });

  it('should reset cache after teardown grace period expires', async () => {
    const { useMLflowStatus, mockAxiosGet } = loadFreshModule();
    mockAxiosGet.mockResolvedValue({ data: { configured: true } });

    const renderResult = testHook(useMLflowStatus)(true);
    await waitFor(() => {
      expect(renderResult.result.current).toStrictEqual({ configured: true, loaded: true });
    });
    expect(mockAxiosGet).toHaveBeenCalledTimes(1);

    // Unsubscribe — grace period starts
    renderResult.rerender(false);
    expect(renderResult.result.current).toStrictEqual({ configured: false, loaded: true });

    // Let grace period expire (TEARDOWN_GRACE_MS = 1000)
    jest.advanceTimersByTime(1000);

    // Re-subscribe after grace expired — fresh fetch
    mockAxiosGet.mockResolvedValue({ data: { configured: false } });
    renderResult.rerender(true);
    expect(renderResult.result.current).toStrictEqual({ configured: false, loaded: false });

    await waitFor(() => {
      expect(renderResult.result.current).toStrictEqual({ configured: false, loaded: true });
    });
    expect(mockAxiosGet).toHaveBeenCalledTimes(2);
  });

  it('should start fetching when shouldFetch transitions from false to true', async () => {
    const { useMLflowStatus, mockAxiosGet } = loadFreshModule();
    mockAxiosGet.mockResolvedValue({ data: { configured: true } });

    const renderResult = testHook(useMLflowStatus)(false);
    expect(renderResult).hookToStrictEqual({ configured: false, loaded: true });
    expect(mockAxiosGet).not.toHaveBeenCalled();

    renderResult.rerender(true);

    await waitFor(() => {
      expect(renderResult.result.current).toStrictEqual({ configured: true, loaded: true });
    });

    expect(mockAxiosGet).toHaveBeenCalledTimes(1);
  });

  it('should recover on next poll after a failure', async () => {
    const { useMLflowStatus, mockAxiosGet } = loadFreshModule();
    mockAxiosGet.mockRejectedValueOnce(new Error('Network error'));

    const renderResult = testHook(useMLflowStatus)(true);

    // First poll fails — stays at initialValue
    await waitFor(() => {
      expect(mockAxiosGet).toHaveBeenCalledTimes(1);
    });
    expect(renderResult.result.current).toStrictEqual({ configured: false, loaded: false });

    mockAxiosGet.mockResolvedValueOnce({ data: { configured: true } });
    jest.advanceTimersByTime(POLL_INTERVAL);

    await waitFor(() => {
      expect(renderResult.result.current).toStrictEqual({ configured: true, loaded: true });
    });

    expect(mockAxiosGet).toHaveBeenCalledTimes(2);
  });

  it('should poll periodically while subscribed', async () => {
    const { useMLflowStatus, mockAxiosGet } = loadFreshModule();
    mockAxiosGet.mockResolvedValue({ data: { configured: true } });

    testHook(useMLflowStatus)(true);

    await waitFor(() => {
      expect(mockAxiosGet).toHaveBeenCalledTimes(1);
    });

    jest.advanceTimersByTime(POLL_INTERVAL);
    await waitFor(() => {
      expect(mockAxiosGet).toHaveBeenCalledTimes(2);
    });

    jest.advanceTimersByTime(POLL_INTERVAL);
    await waitFor(() => {
      expect(mockAxiosGet).toHaveBeenCalledTimes(3);
    });
  });
});
