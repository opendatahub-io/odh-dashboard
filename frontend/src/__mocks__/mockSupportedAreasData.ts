import type { SupportedAreasState } from '@odh-dashboard/plugin-core/areas';
import { mockDashboardConfig } from '@odh-dashboard/k8s-core/__mocks__/mockDashboardConfig';
import { SupportedAreasStateMap } from '#~/concepts/areas/const.ts';
import { IsAreaAvailableOptions } from '#~/concepts/areas/utils.ts';

export const mockSupportedAreasStateMap = (
  overrides: SupportedAreasState = {},
): SupportedAreasState => ({
  ...SupportedAreasStateMap,
  ...overrides,
});

export const mockIsAreaAvailableOptions = (overrides: {
  stateMapOverrides?: SupportedAreasState;
  dashboardConfigOverrides?: Parameters<typeof mockDashboardConfig>[0];
}): IsAreaAvailableOptions => ({
  internalStateMap: mockSupportedAreasStateMap(overrides.stateMapOverrides ?? {}),
  flagState: mockDashboardConfig(overrides.dashboardConfigOverrides ?? {}).spec.dashboardConfig,
});
