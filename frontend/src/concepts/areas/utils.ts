import {
  DashboardConfigKind,
  DataScienceClusterInitializationKindStatus,
  DataScienceClusterKindStatus,
} from '~/k8sTypes';
import { IsAreaAvailableStatus, FeatureFlag, SupportedArea } from './types';
import { SupportedAreasStateMap, allFeatureFlags } from './const';

export const isFeatureFlag = (key: string): key is FeatureFlag => allFeatureFlags.includes(key);

type FlagState = { [flag in FeatureFlag]?: boolean };
const getFlags = (dashboardConfigSpec: DashboardConfigKind['spec']): FlagState => {
  const flags = dashboardConfigSpec.dashboardConfig;

  return {
    ...Object.entries(flags).reduce<FlagState>((acc, [key, value]) => {
      if (isFeatureFlag(key)) {
        acc[key] = key.startsWith('disable') ? !value : value;
      }
      return acc;
    }, {}),
    // TODO: support this better; improve types
    // notebookController: dashboardConfigSpec.notebookController?.enabled ?? false,
  };
};

export const isAreaAvailable = (
  area: SupportedArea,
  dashboardConfigSpec: DashboardConfigKind['spec'],
  dscStatus: DataScienceClusterKindStatus | null,
  dsciStatus: DataScienceClusterInitializationKindStatus | null,
): IsAreaAvailableStatus => {
  const { featureFlags, requiredComponents, reliantAreas, requiredCapabilities } =
    SupportedAreasStateMap[area];

  const reliantAreasState = reliantAreas
    ? reliantAreas.reduce<IsAreaAvailableStatus['reliantAreas']>(
        (areaStates, currentArea) => ({
          ...areaStates,
          [currentArea]: isAreaAvailable(currentArea, dashboardConfigSpec, dscStatus, dsciStatus)
            .status,
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
          (acc, component) => ({ ...acc, [component]: dscStatus.installedComponents?.[component] }),
          {},
        )
      : null;
  const hasMetRequiredComponents = requiredComponentsState
    ? Object.values(requiredComponentsState).every((v) => v)
    : true;

  const requiredCapabilitiesState =
    requiredCapabilities && dsciStatus
      ? requiredCapabilities.reduce<IsAreaAvailableStatus['requiredCapabilities']>(
          (acc, capability) => ({
            ...acc,
            [capability]: dsciStatus.conditions.some(
              (c) => c.type === capability && c.status === 'True',
            ),
          }),
          {},
        )
      : null;

  const hasMetRequiredCapabilities = requiredCapabilitiesState
    ? Object.values(requiredCapabilitiesState).every((v) => v)
    : true;

  return {
    status:
      hasMetReliantAreas &&
      hasMetFeatureFlags &&
      hasMetRequiredComponents &&
      hasMetRequiredCapabilities,
    reliantAreas: reliantAreasState,
    featureFlags: featureFlagState,
    requiredComponents: requiredComponentsState,
    requiredCapabilities: requiredCapabilitiesState,
    customCondition: (conditionFunc) =>
      conditionFunc({ dashboardConfigSpec, dscStatus, dsciStatus }),
  };
};
