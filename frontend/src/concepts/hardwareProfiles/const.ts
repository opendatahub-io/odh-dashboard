// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- re-exporting from hardware-profiles for backward compatibility
export {
  HARDWARE_PROFILES_MISSING_CPU_MEMORY_MESSAGE,
  HardwareProfileBindingState,
  HARDWARE_PROFILE_BINDING_CONFIG,
  HARDWARE_PROFILE_SELECTION_HELP,
  REMOVE_HARDWARE_PROFILE_ANNOTATIONS_PATCH,
  WORKBENCH_VISIBILITY,
  MODEL_SERVING_VISIBILITY,
  INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS,
} from '@odh-dashboard/hardware-profiles-shared';

export enum QueueSource {
  HARDWARE_PROFILE = 'hardware-profile',
  DIRECT = 'direct',
}
