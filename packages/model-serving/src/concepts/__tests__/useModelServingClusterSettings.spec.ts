import { testHook, standardUseFetchStateObject } from '@odh-dashboard/jest-config/hooks';
import { fetchDashboardConfig } from '@odh-dashboard/internal/services/dashboardConfigService';
import { DashboardConfigKind } from '@odh-dashboard/internal/k8sTypes';
import { useModelServingClusterSettings } from '../useModelServingClusterSettings';

jest.mock('@odh-dashboard/internal/services/dashboardConfigService');

const fetchDashboardConfigMock = jest.mocked(fetchDashboardConfig);

describe('useModelServingClusterSettings', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return loaded when config.spec.modelServing is undefined', async () => {
    fetchDashboardConfigMock.mockResolvedValue({
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
    expect(fetchDashboardConfigMock).toHaveBeenCalledTimes(1);
  });
});
