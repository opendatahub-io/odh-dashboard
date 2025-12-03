import {
  useAssignHardwareProfile,
  type UseAssignHardwareProfileResult,
} from '@odh-dashboard/internal/concepts/hardwareProfiles/useAssignHardwareProfile';
import { MODEL_SERVING_VISIBILITY } from '@odh-dashboard/internal/concepts/hardwareProfiles/const';
import type { CrPathConfig } from '@odh-dashboard/internal/concepts/hardwareProfiles/types';
import type { ModelResourceType } from '../../../extension-points';

/**
 * Hook to manage hardware profile configuration for model serving deployments.
 * Automatically fetches hardware profiles for the model's namespace if not in context.
 */
export const useModelServingHardwareProfile = (
  model: ModelResourceType | null | undefined,
  paths?: CrPathConfig,
): UseAssignHardwareProfileResult<ModelResourceType> => {
  return useAssignHardwareProfile(model, {
    visibleIn: MODEL_SERVING_VISIBILITY,
    paths,
  });
};
