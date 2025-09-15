import { SupportedAreasStateMap } from '#~/concepts/areas/const.ts';
import { SupportedAreasState } from '#~/concepts/areas/types.ts';
import { mockDashboardConfig } from '#~/__mocks__/mockDashboardConfig.ts';
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
