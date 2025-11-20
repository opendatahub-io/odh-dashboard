import React from 'react';
import {
  useAssignHardwareProfile,
  UseAssignHardwareProfileResult,
} from '@odh-dashboard/internal/concepts/hardwareProfiles/useAssignHardwareProfile';
import { MODEL_SERVING_VISIBILITY } from '@odh-dashboard/internal/concepts/hardwareProfiles/const';
import { CrPathConfig } from '@odh-dashboard/internal/concepts/hardwareProfiles/types';
import { ModelResourceType } from '../../../extension-points';
import { ModelDeploymentsContext } from '../../concepts/ModelDeploymentsContext.tsx';

export const useModelServingHardwareProfile = (
  model: ModelResourceType | null | undefined,
  paths?: CrPathConfig,
): UseAssignHardwareProfileResult<ModelResourceType> => {
  const { projectHardwareProfiles, projectHardwareProfilesLoaded, projectHardwareProfilesError } =
    React.useContext(ModelDeploymentsContext);
  return useAssignHardwareProfile(
    model,
    {
      visibleIn: MODEL_SERVING_VISIBILITY,
      paths,
    },
    projectHardwareProfiles
      ? [projectHardwareProfiles, projectHardwareProfilesLoaded, projectHardwareProfilesError]
      : undefined,
  );
};
