import type { CrPathConfig } from '#~/concepts/hardwareProfiles/types.ts';

export const NOTEBOOK_HARDWARE_PROFILE_PATHS: CrPathConfig = {
  containerResourcesPath: 'spec.template.spec.containers.0.resources',
  tolerationsPath: 'spec.template.spec.tolerations',
  nodeSelectorPath: 'spec.template.spec.nodeSelector',
};
