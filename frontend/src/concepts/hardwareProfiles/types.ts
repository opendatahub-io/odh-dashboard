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
