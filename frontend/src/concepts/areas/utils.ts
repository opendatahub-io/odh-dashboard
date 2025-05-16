import {
  DashboardConfigKind,
  DataScienceClusterInitializationKindStatus,
  DataScienceClusterKindStatus,
} from '~/k8sTypes';
import { IsAreaAvailableStatus, FeatureFlag, SupportedAreaType } from './types';
import { definedFeatureFlags, SupportedAreasStateMap } from './const';

export const isDefinedFeatureFlag = (key: string): key is FeatureFlag =>
  definedFeatureFlags.includes(key);

export type FlagState = { [flag in string]?: boolean };

// TODO: support this better; improve types
// notebookController: dashboardConfigSpec.notebookController?.enabled ?? false,
export const getFlags = (dashboardConfigSpec: DashboardConfigKind['spec']): FlagState =>
  dashboardConfigSpec.dashboardConfig;

const isFlagOn = (flag: string, flagState: FlagState): 'on' | 'off' => {
  if (flagState[flag] === undefined) {
    return 'off';
  }
  const enabled = flag.startsWith('disable') ? !flagState[flag] : flagState[flag];
  return enabled ? 'on' : 'off';
};

export const isAreaAvailable = (
  area: SupportedAreaType,
  dashboardConfigSpec: DashboardConfigKind['spec'],
  dscStatus: DataScienceClusterKindStatus | null,
  dsciStatus: DataScienceClusterInitializationKindStatus | null,
  options = {
    internalStateMap: SupportedAreasStateMap,
    flagState: getFlags(dashboardConfigSpec),
  },
): IsAreaAvailableStatus => {
  const { devFlags, featureFlags, requiredComponents, reliantAreas, requiredCapabilities } =
    options.internalStateMap[area];

  const reliantAreasState = reliantAreas
    ? reliantAreas.reduce<IsAreaAvailableStatus['reliantAreas']>(
        (areaStates, currentArea) => ({
          ...areaStates,
          [currentArea]: isAreaAvailable(
            currentArea,
            dashboardConfigSpec,
            dscStatus,
            dsciStatus,
            options,
          ).status,
        }),
        {},
      )
    : null;
  // Only need one to be true to work
  const reliantAreaValues = reliantAreasState ? Object.values(reliantAreasState) : [];
  const hasMetReliantAreas = reliantAreaValues.length > 0 ? reliantAreaValues.some((v) => v) : true;

  const devFlagsState = devFlags
    ? devFlags.reduce<NonNullable<IsAreaAvailableStatus['devFlags']>>((acc, flag) => {
        acc[flag] = isFlagOn(flag, options.flagState);
        return acc;
      }, {})
    : null;
  const featureFlagState = featureFlags
    ? featureFlags.reduce<NonNullable<IsAreaAvailableStatus['featureFlags']>>((acc, flag) => {
        acc[flag] = isFlagOn(flag, options.flagState);
        return acc;
      }, {})
    : null;
  const hasMetFeatureFlags =
    (!featureFlagState || Object.values(featureFlagState).every((v) => v === 'on')) &&
    (!devFlagsState || Object.values(devFlagsState).every((v) => v === 'on'));

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
    devFlags: devFlagsState,
    featureFlags: featureFlagState,
    requiredComponents: requiredComponentsState,
    requiredCapabilities: requiredCapabilitiesState,
    customCondition: (conditionFunc) =>
      conditionFunc({ dashboardConfigSpec, dscStatus, dsciStatus }),
  };
};
