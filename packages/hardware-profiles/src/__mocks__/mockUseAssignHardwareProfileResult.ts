import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import type {
  HardwareProfileKind,
  ContainerResources,
  Toleration,
  NodeSelector,
} from '@odh-dashboard/k8s-core';
import type { UseAssignHardwareProfileResult } from '../../shared/useAssignHardwareProfile';
import { applyHardwareProfileConfig } from '../../shared/utils';
import { INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS } from '../../shared/const';
import type { CrPathConfig } from '../../shared/types';

type MockHardwareProfileOptionsConfig = {
  selectedHardwareProfile?: HardwareProfileKind;
  resources?: ContainerResources;
  tolerations?: Toleration[];
  nodeSelector?: NodeSelector;
  paths?: CrPathConfig;
  existingBinding?: { name?: string; namespace?: string };
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
  paths = INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS,
  existingBinding,
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
        existingBinding: existingBinding ?? {},
        excludeDRAProfiles: true,
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
      return applyHardwareProfileConfig(resource, formData, paths, existingBinding);
    },
    validateHardwareProfileForm: () => true,
    loaded: true,
    error: undefined,
  };
};
