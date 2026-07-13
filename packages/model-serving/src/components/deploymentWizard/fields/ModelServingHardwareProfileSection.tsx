import React from 'react';
import {
  HardwareProfileFormSection,
  MODEL_SERVING_VISIBILITY,
} from '@odh-dashboard/hardware-profiles/shared';
import type {
  UseHardwareProfileConfigResult,
  HardwarePodSpecOptionsState,
  PodSpecOptions,
} from '@odh-dashboard/hardware-profiles/shared';

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
