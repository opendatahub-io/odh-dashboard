import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { UseAssignHardwareProfileResult } from '#~/concepts/hardwareProfiles/useAssignHardwareProfile';
import { HardwareProfileKind } from '#~/k8sTypes';
import type { ContainerResources, Toleration, NodeSelector } from '#~/types';
import { applyHardwareProfileConfig } from '#~/concepts/hardwareProfiles/utils';
import { NOTEBOOK_HARDWARE_PROFILE_PATHS } from '#~/concepts/notebooks/const';
import type { CrPathConfig } from '#~/concepts/hardwareProfiles/types';

type MockHardwareProfileOptionsConfig = {
  selectedHardwareProfile?: HardwareProfileKind;
  resources?: ContainerResources;
  tolerations?: Toleration[];
  nodeSelector?: NodeSelector;
  paths?: CrPathConfig;
};

export const mockUseAssignHardwareProfileResult = <T extends K8sResourceCommon>({
  selectedHardwareProfile,
  resources = {
    requests: {
      memory: '2Gi',
      cpu: '500m',
    },
    limits: {
      memory: '2Gi',
      cpu: '500m',
    },
  },
  tolerations = [],
  nodeSelector = {},
  paths = NOTEBOOK_HARDWARE_PROFILE_PATHS,
}: MockHardwareProfileOptionsConfig = {}): UseAssignHardwareProfileResult<T> => {
  const formData = {
    selectedProfile: selectedHardwareProfile,
    useExistingSettings: false,
    resources,
  };

  return {
    podSpecOptionsState: {
      hardwareProfile: {
        formData,
        initialHardwareProfile: selectedHardwareProfile,
        isFormDataValid: true,
        setFormData: () => {
          // Mock function
        },
        resetFormData: () => {
          // Mock function
        },
        profilesLoaded: true,
        profilesLoadError: undefined,
      },
      podSpecOptions: {
        resources,
        tolerations,
        nodeSelector,
        selectedHardwareProfile,
      },
    },
    applyToResource: <R extends T>(resource: R): R => {
      return applyHardwareProfileConfig(resource, formData, paths);
    },
    validateHardwareProfileForm: () => true,
    loaded: true,
    error: undefined,
  };
};
