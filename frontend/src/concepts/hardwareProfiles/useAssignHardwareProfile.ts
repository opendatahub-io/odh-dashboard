import React from 'react';
import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import {
  HardwarePodSpecOptionsState,
  HardwarePodSpecOptions,
  HardwareProfileOptions,
  CrPathConfig,
} from '#~/concepts/hardwareProfiles/types';
import { isHardwareProfileConfigValid } from '#~/concepts/hardwareProfiles/validationUtils';
import {
  useHardwareProfileConfig,
  UseHardwareProfileConfigResult,
} from './useHardwareProfileConfig';
import {
  applyHardwareProfileConfig,
  assemblePodSpecOptions,
  getExistingHardwareProfileData,
  getExistingResources,
} from './utils';

export { useWatchHardwareProfiles } from '#~/utilities/useWatchHardwareProfiles';

export type UseAssignHardwareProfileResult<T extends K8sResourceCommon> = {
  podSpecOptionsState: HardwarePodSpecOptionsState<HardwarePodSpecOptions>;
  applyToResource: <R extends T>(resource: R, runtimePaths?: CrPathConfig) => R; // apply the current hardware profile configuration to a custom resource
  validateHardwareProfileForm: () => boolean;
  loaded: boolean;
  error?: Error;
};

export const useAssignHardwareProfile = <T extends K8sResourceCommon>(
  cr: T | null | undefined,
  hardwareProfileOptions: HardwareProfileOptions,
): UseAssignHardwareProfileResult<T> => {
  const { visibleIn, paths } = hardwareProfileOptions;
  const { name: hwpName, namespace: hwpNamespace } = getExistingHardwareProfileData(cr);
  const existingResources = getExistingResources(cr, paths);
  const { existingContainerResources, existingTolerations, existingNodeSelector } =
    existingResources;
  const namespace = cr?.metadata?.namespace;
  const hardwareProfileConfig: UseHardwareProfileConfigResult = useHardwareProfileConfig(
    hwpName,
    existingContainerResources,
    existingTolerations,
    existingNodeSelector,
    visibleIn,
    namespace,
    hwpNamespace,
  );
  const podSpecOptions = assemblePodSpecOptions(hardwareProfileConfig, existingResources);

  const podSpecOptionsState: HardwarePodSpecOptionsState<HardwarePodSpecOptions> = {
    hardwareProfile: hardwareProfileConfig,
    podSpecOptions,
  };

  const applyToResource = React.useCallback(
    <R extends T>(targetResource: R, resourcePaths?: CrPathConfig): R => {
      return applyHardwareProfileConfig(
        targetResource,
        hardwareProfileConfig.formData,
        resourcePaths || paths,
      );
    },
    [paths, hardwareProfileConfig.formData],
  );

  const validateHardwareProfileForm = React.useCallback((): boolean => {
    return isHardwareProfileConfigValid(hardwareProfileConfig.formData);
  }, [hardwareProfileConfig.formData]);

  return {
    podSpecOptionsState,
    applyToResource,
    validateHardwareProfileForm,
    loaded: hardwareProfileConfig.profilesLoaded,
    error: hardwareProfileConfig.profilesLoadError,
  };
};
