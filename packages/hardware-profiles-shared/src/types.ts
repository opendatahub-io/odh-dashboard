import { AlertProps } from '@patternfly/react-core';
import type { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import {
  HardwareProfileFeatureVisibility,
  type HardwareProfileKind,
  ContainerResources,
  Toleration,
  NodeSelector,
} from '@odh-dashboard/k8s-core';
import type { AcceleratorProfileKind } from '@odh-dashboard/internal/k8sTypes';
import type useAcceleratorProfileFormState from '@odh-dashboard/internal/utilities/useAcceleratorProfileFormState';
import { HardwareProfileBindingState } from './const';
import { useHardwareProfileConfig } from './useHardwareProfileConfig';

export type WarningNotification = {
  title: string;
  message: string;
};

export enum HardwareProfileWarningType {
  HARDWARE_PROFILES_MISSING_CPU_MEMORY = 'hardware_profiles_missing_cpu_memory',
  CANNOT_BE_NEGATIVE = 'cannot_be_negative',
  CANNOT_BE_DECIMAL = 'cannot_be_decimal',
  INVALID_UNIT = 'invalid_unit',
  INVALID_NO = 'invalid_no',
  MISSING_VALUE = 'missing_value',
  OUT_OF_RANGE = 'out_of_range',
  OTHER = 'other',
}

export type PodSpecOptions = {
  resources?: ContainerResources;
  tolerations?: Toleration[];
  nodeSelector?: NodeSelector;
  selectedAcceleratorProfile?: AcceleratorProfileKind;
  selectedHardwareProfile?: HardwareProfileKind;
};

export type HardwarePodSpecOptions = {
  resources?: ContainerResources;
  tolerations?: Toleration[];
  nodeSelector?: NodeSelector;
  selectedHardwareProfile?: HardwareProfileKind;
};

/**
 * @deprecated
 * only in modelmesh deprecation path
 * modelmesh: RHOAIENG-34917, RHOAIENG-19185
 */
export type PodSpecOptionsAcceleratorState<T extends PodSpecOptions> = {
  acceleratorProfile: ReturnType<typeof useAcceleratorProfileFormState>;
  hardwareProfile: ReturnType<typeof useHardwareProfileConfig>;
  podSpecOptions: T;
};

export type HardwarePodSpecOptionsState<T extends HardwarePodSpecOptions> = {
  hardwareProfile: ReturnType<typeof useHardwareProfileConfig>;
  podSpecOptions: T;
};

export type ResourceType = 'workbench' | 'deployment';

/**
 * Minimal K8s resource shape accepted by hardware-profile utilities.
 * model-serving's `ModelResourceType` and similar types satisfy this interface.
 */
export type HardwareProfileResource = K8sResourceCommon & {
  metadata: {
    name: string;
    namespace: string;
  };
};

export type HardwareProfileBindingStateInfo = {
  state?: HardwareProfileBindingState;
  profile?: HardwareProfileKind;
};

export type HardwareProfileBindingConfig = {
  labelText: string;
  labelColor: 'red' | 'yellow' | 'green';
  alertVariant: AlertProps['variant'];
  testId: string;
  title: string;
  getBodyText: (params: {
    resourceType: ResourceType;
    isRunning: boolean;
    name?: string;
  }) => string;
};

export type CrPathConfig = {
  containerResourcesPath: string;
  tolerationsPath: string;
  nodeSelectorPath: string;
};

export type HardwareProfileOptions = {
  visibleIn: HardwareProfileFeatureVisibility[];
  paths?: CrPathConfig;
};
