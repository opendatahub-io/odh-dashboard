import React from 'react';
import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import {
  HardwarePodSpecOptionsState,
  HardwarePodSpecOptions,
  HardwareProfileOptions,
} from '#~/concepts/hardwareProfiles/types.ts';
import { isHardwareProfileConfigValid } from '#~/concepts/hardwareProfiles/validationUtils.ts';
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

export type UseAssignHardwareProfileResult<T extends K8sResourceCommon> = {
  podSpecOptionsState: HardwarePodSpecOptionsState<HardwarePodSpecOptions>;
  applyToResource: <R extends T>(resource: R) => R; // apply the current hardware profile configuration to a custom resource
  validateHardwareProfileForm: () => boolean;
  loaded: boolean;
  error?: Error;
};

export const useAssignHardwareProfile = <T extends K8sResourceCommon>(
  cr: T | null | undefined,
  hardwareProfileOptions: HardwareProfileOptions,
  projectNamespace?: string, // leave out if global namespace
): UseAssignHardwareProfileResult<T> => {
  const { visibleIn, paths } = hardwareProfileOptions;
  const { name: hwpName, namespace: hwpNamespace } = getExistingHardwareProfileData(cr);
  const existingResources = getExistingResources(cr, paths);
  const { existingContainerResources, existingTolerations, existingNodeSelector } =
    existingResources;
  const namespace = projectNamespace || cr?.metadata?.namespace;
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
    <R extends T>(targetResource: R): R => {
      return applyHardwareProfileConfig(targetResource, hardwareProfileConfig.formData, paths);
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
