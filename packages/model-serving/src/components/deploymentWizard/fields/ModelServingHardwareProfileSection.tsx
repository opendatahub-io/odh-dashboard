import React from 'react';
import HardwareProfileFormSection from '@odh-dashboard/internal/concepts/hardwareProfiles/HardwareProfileFormSection';
import { UseAssignHardwareProfileResult } from '@odh-dashboard/internal/concepts/hardwareProfiles/useAssignHardwareProfile';
import { MODEL_SERVING_VISIBILITY } from '@odh-dashboard/internal/concepts/hardwareProfiles/const';
import { ModelResourceType } from '../../../../extension-points';

type ModelServingHardwareProfileSectionComponentProps = {
  hardwareProfileOptions?: UseAssignHardwareProfileResult<ModelResourceType>;
  project?: string;
  isEditing?: boolean;
};

export const ModelServingHardwareProfileSection: React.FC<
  ModelServingHardwareProfileSectionComponentProps
> = ({ hardwareProfileOptions, project, isEditing = false }) => {
  if (!hardwareProfileOptions) {
    return null;
  }

  return (
    <HardwareProfileFormSection
      project={project}
      podSpecOptionsState={hardwareProfileOptions.podSpecOptionsState}
      isEditing={isEditing}
      isHardwareProfileSupported={() => true}
      visibleIn={MODEL_SERVING_VISIBILITY}
    />
  );
};
