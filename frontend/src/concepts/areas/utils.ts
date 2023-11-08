import { DashboardConfigKind, DataScienceClusterKindStatus } from '~/k8sTypes';
import { IsAreaAvailableStatus, FeatureFlag, SupportedArea } from './types';
import { SupportedAreasStateMap } from './const';

type FlagState = { [flag in FeatureFlag]?: boolean };
const getFlags = (dashboardConfigSpec: DashboardConfigKind['spec']): FlagState => {
  const flags = dashboardConfigSpec.dashboardConfig;

  // TODO: Improve to be a list of items
  const isFeatureFlag = (key: string, value: unknown): key is FeatureFlag =>
    typeof value === 'boolean';

  return {
    ...Object.keys(flags).reduce<FlagState>((flagState, key) => {
      const value = flags[key as FeatureFlag];
      if (isFeatureFlag(key, value)) {
        flagState[key] = key.startsWith('disable') ? !value : value;
      }
      return flagState;
    }, {}),
    // TODO: support this better; improve types
    // notebookController: dashboardConfigSpec.notebookController?.enabled ?? false,
  };
};

export const isAreaAvailable = (
  area: SupportedArea,
  dashboardConfigSpec: DashboardConfigKind['spec'],
  dscStatus: DataScienceClusterKindStatus | null,
): IsAreaAvailableStatus => {
  const { featureFlags, requiredComponents, reliantAreas } = SupportedAreasStateMap[area];

  const reliantAreasState = reliantAreas
    ? reliantAreas.reduce<IsAreaAvailableStatus['reliantAreas']>(
        (areaStates, area) => ({
          ...areaStates,
          [area]: isAreaAvailable(area, dashboardConfigSpec, dscStatus).status,
        }),
        {},
      )
    : null;
  // Only need one to be true to work
  const reliantAreaValues = reliantAreasState ? Object.values(reliantAreasState) : [];
  const hasMetReliantAreas = reliantAreaValues.length > 0 ? reliantAreaValues.some((v) => v) : true;

  const flagState = getFlags(dashboardConfigSpec);
  const featureFlagState = featureFlags
    ? featureFlags.reduce<IsAreaAvailableStatus['featureFlags']>(
        (acc, flag) => ({ ...acc, [flag]: flagState[flag] ? 'on' : 'off' }),
        {},
      )
    : null;
  const hasMetFeatureFlags = featureFlagState
    ? Object.values(featureFlagState).every((v) => v === 'on')
    : true;

  const requiredComponentsState =
    requiredComponents && dscStatus
      ? requiredComponents.reduce<IsAreaAvailableStatus['requiredComponents']>(
          (acc, component) => ({ ...acc, [component]: dscStatus.installedComponents[component] }),
          {},
        )
      : null;
  const hasMetRequiredComponents = requiredComponentsState
    ? Object.values(requiredComponentsState).every((v) => v)
    : true;

  return {
    status: hasMetReliantAreas && hasMetFeatureFlags && hasMetRequiredComponents,
    reliantAreas: reliantAreasState,
    featureFlags: featureFlagState,
    requiredComponents: requiredComponentsState,
  };
};
