import { Patch } from '@openshift/dynamic-plugin-sdk-utils';

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
