import { Patch } from '@openshift/dynamic-plugin-sdk-utils';
import { HardwareProfileFeatureVisibility } from '@odh-dashboard/k8s-core';

export {
  HardwareProfileBindingState,
  HARDWARE_PROFILE_SELECTION_HELP,
  HARDWARE_PROFILE_BINDING_CONFIG,
  LOCAL_QUEUE_MISSING_BODY,
  MODEL_SERVING_VISIBILITY,
  INFERENCE_SERVICE_HARDWARE_PROFILE_PATHS,
} from '@odh-dashboard/hardware-profiles/shared/const';

export const HARDWARE_PROFILES_MISSING_CPU_MEMORY_MESSAGE =
  'Omitting CPU or Memory resources is not recommended.';

export const REMOVE_HARDWARE_PROFILE_ANNOTATIONS_PATCH: Patch[] = [
  {
    op: 'remove',
    path: '/metadata/annotations/opendatahub.io~1hardware-profile-name',
  },
  {
    op: 'remove',
    path: '/metadata/annotations/opendatahub.io~1hardware-profile-namespace',
  },
];

export const WORKBENCH_VISIBILITY = [HardwareProfileFeatureVisibility.WORKBENCH];
