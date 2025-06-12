import { AcceleratorProfileKind, HardwareProfileKind } from '#~/k8sTypes';
import { ContainerResources, Toleration, NodeSelector } from '#~/types';
import useAcceleratorProfileFormState from '#~/utilities/useAcceleratorProfileFormState';
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

export type PodSpecOptionsState<T extends PodSpecOptions> = {
  acceleratorProfile: ReturnType<typeof useAcceleratorProfileFormState>;
  hardwareProfile: ReturnType<typeof useHardwareProfileConfig>;
  podSpecOptions: T;
};
