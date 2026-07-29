import type { PodSpecOptions } from '@odh-dashboard/hardware-profiles/shared/types';
import type { useHardwareProfileConfig } from '@odh-dashboard/hardware-profiles/shared/useHardwareProfileConfig';
import type useAcceleratorProfileFormState from '#~/utilities/useAcceleratorProfileFormState';

export type {
  PodSpecOptions,
  HardwarePodSpecOptions,
  HardwarePodSpecOptionsState,
  ResourceType,
  HardwareProfileResource,
  HardwareProfileBindingStateInfo,
  HardwareProfileBindingConfig,
  CrPathConfig,
  HardwareProfileOptions,
} from '@odh-dashboard/hardware-profiles/shared/types';

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
