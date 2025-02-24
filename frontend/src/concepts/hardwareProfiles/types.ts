import { AcceleratorProfileKind, HardwareProfileKind } from '~/k8sTypes';
import { ContainerResources, Toleration, NodeSelector } from '~/types';
import useAcceleratorProfileFormState from '~/utilities/useAcceleratorProfileFormState';
import { useHardwareProfileConfig } from './useHardwareProfileConfig';

export type WarningNotification = {
  title: string;
  message: string;
};

export enum HardwareProfileWarningType {
  HARDWARE_PROFILES_MISSING_CPU_MEMORY,
  OTHER,
}

export type PodSpecOptions = {
  resources?: ContainerResources;
  tolerations?: Toleration[];
  nodeSelector?: NodeSelector;
  selectedAcceleratorProfile?: AcceleratorProfileKind;
  selectedHardwareProfile?: HardwareProfileKind;
};

export type PodSpecOptionsState<T extends PodSpecOptions> = {
  acceleratorProfile: ReturnType<typeof useAcceleratorProfileFormState>;
  hardwareProfile: ReturnType<typeof useHardwareProfileConfig>;
  podSpecOptions: T;
};
