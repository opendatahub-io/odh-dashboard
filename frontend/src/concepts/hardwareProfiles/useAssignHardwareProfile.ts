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
  applyToResource: (resource: T) => T; // apply the current hardware profile configuration to a custom resource
  validateHardwareProfileForm: () => boolean;
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
    (targetResource: T): T => {
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
  };
};
