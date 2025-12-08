import React from 'react';
import HardwareProfileFormSection from '@odh-dashboard/internal/concepts/hardwareProfiles/HardwareProfileFormSection';
import { type UseHardwareProfileConfigResult } from '@odh-dashboard/internal/concepts/hardwareProfiles/useHardwareProfileConfig';
import { MODEL_SERVING_VISIBILITY } from '@odh-dashboard/internal/concepts/hardwareProfiles/const';
import type {
  HardwarePodSpecOptionsState,
  PodSpecOptions,
} from '@odh-dashboard/internal/concepts/hardwareProfiles/types';

type ModelServingHardwareProfileSectionComponentProps = {
  hardwareProfileConfig: UseHardwareProfileConfigResult;
  project?: string;
  isEditing?: boolean;
};

export const ModelServingHardwareProfileSection: React.FC<
  ModelServingHardwareProfileSectionComponentProps
> = ({ hardwareProfileConfig, project, isEditing = false }) => {
  const podSpecOptionsState: HardwarePodSpecOptionsState<PodSpecOptions> = React.useMemo(
    () => ({
      hardwareProfile: hardwareProfileConfig,
      podSpecOptions: {
        resources: hardwareProfileConfig.formData.resources,
        tolerations: undefined,
        nodeSelector: undefined,
      },
    }),
    [hardwareProfileConfig],
  );

  return (
    <HardwareProfileFormSection
      project={project}
      podSpecOptionsState={podSpecOptionsState}
      isEditing={isEditing}
      isHardwareProfileSupported={() => true}
      visibleIn={MODEL_SERVING_VISIBILITY}
    />
  );
};
