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
});
