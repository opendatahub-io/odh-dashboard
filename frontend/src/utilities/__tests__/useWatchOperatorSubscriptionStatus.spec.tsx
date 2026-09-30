import { standardUseFetchState, testHook } from '@odh-dashboard/jest-config/hooks';
import { fetchOperatorSubscriptionStatus } from '@odh-dashboard/k8s-core';
import type { OperatorSubscriptionStatus } from '@odh-dashboard/k8s-core';
import { useWatchOperatorSubscriptionStatus } from '#~/utilities/useWatchOperatorSubscriptionStatus';

jest.mock('@odh-dashboard/k8s-core', () => ({
  fetchOperatorSubscriptionStatus: jest.fn(),
}));

const mockFetchOperatorSubscriptionStatus = jest.mocked(fetchOperatorSubscriptionStatus);

describe('useWatchOperatorSubscriptionStatus', () => {
  beforeEach(() => {
    mockFetchOperatorSubscriptionStatus.mockReset();
  });

  it('should forward the abort signal and keep the fetch callback stable', async () => {
    const status: OperatorSubscriptionStatus = { channel: 'fast' };
    mockFetchOperatorSubscriptionStatus.mockResolvedValue(status);

    const renderResult = testHook(useWatchOperatorSubscriptionStatus)();

    expect(renderResult).hookToStrictEqual(standardUseFetchState(null));
    expect(mockFetchOperatorSubscriptionStatus).toHaveBeenCalledTimes(1);
    expect(mockFetchOperatorSubscriptionStatus).toHaveBeenCalledWith('', {
      signal: expect.any(AbortSignal),
    });

    await renderResult.waitForNextUpdate();
    expect(renderResult.result.current[0]).toEqual(status);

    renderResult.rerender();

    expect(mockFetchOperatorSubscriptionStatus).toHaveBeenCalledTimes(1);
  });

  it('should abort the request when the hook unmounts', () => {
    mockFetchOperatorSubscriptionStatus.mockReturnValue(
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      new Promise<OperatorSubscriptionStatus>(() => {}),
    );

    const renderResult = testHook(useWatchOperatorSubscriptionStatus)();
    const requestOptions = mockFetchOperatorSubscriptionStatus.mock.calls[0][1];

    expect(requestOptions?.signal).toBeInstanceOf(AbortSignal);
    expect(requestOptions?.signal?.aborted).toBe(false);

    renderResult.unmount();

    expect(requestOptions?.signal?.aborted).toBe(true);
  });

  it('should expose request failures in the fetch state', async () => {
    const requestError = new Error('subscription status unavailable');
    mockFetchOperatorSubscriptionStatus.mockRejectedValue(requestError);

    const renderResult = testHook(useWatchOperatorSubscriptionStatus)();

    await renderResult.waitForNextUpdate();

    expect(renderResult.result.current).toEqual([null, false, requestError, expect.any(Function)]);
  });
});
