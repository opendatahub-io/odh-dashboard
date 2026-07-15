import type { AlertProps } from '@patternfly/react-core';
import type { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import {
  HardwareProfileFeatureVisibility,
  type HardwareProfileKind,
  type AcceleratorProfileKind,
  ContainerResources,
  Toleration,
  NodeSelector,
} from '@odh-dashboard/k8s-core';
import { HardwareProfileBindingState } from './const';
import type { useHardwareProfileConfig } from './useHardwareProfileConfig';

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
