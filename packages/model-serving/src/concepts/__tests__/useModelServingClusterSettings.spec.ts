import { testHook, standardUseFetchStateObject } from '@odh-dashboard/jest-config/hooks';
import { useHostApi } from '@odh-dashboard/plugin-core/host-api';
import type { DashboardConfigKind } from '@odh-dashboard/k8s-core';
import { useModelServingClusterSettings } from '../useModelServingClusterSettings';

jest.mock('@odh-dashboard/plugin-core/host-api');

const mockFetchDashboardConfig = jest.fn();
jest.mocked(useHostApi).mockReturnValue({
  fetchDashboardConfig: mockFetchDashboardConfig,
} as unknown as ReturnType<typeof useHostApi>);

describe('useModelServingClusterSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return loaded when config.spec.modelServing is undefined', async () => {
    mockFetchDashboardConfig.mockResolvedValue({
      spec: {},
    } as DashboardConfigKind);

    const renderResult = testHook(useModelServingClusterSettings)();

    expect(renderResult).hookToStrictEqual(standardUseFetchStateObject({ data: undefined }));
    expect(renderResult).hookToHaveUpdateCount(1);

    await renderResult.waitForNextUpdate();

    expect(renderResult).hookToStrictEqual(
      standardUseFetchStateObject({ data: null, loaded: true }),
    );
    expect(renderResult).hookToHaveUpdateCount(2);
    expect(mockFetchDashboardConfig).toHaveBeenCalledTimes(1);
  });
});
