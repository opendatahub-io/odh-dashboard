import React from 'react';
import HardwareProfileFormSection from '@odh-dashboard/internal/concepts/hardwareProfiles/HardwareProfileFormSection';
import {
  useHardwareProfileConfig,
  type UseHardwareProfileConfigResult,
} from '@odh-dashboard/internal/concepts/hardwareProfiles/useHardwareProfileConfig';
import { SupportedArea, useIsAreaAvailable } from '@odh-dashboard/internal/concepts/areas/index';
import { HardwareProfileFeatureVisibility } from '@odh-dashboard/internal/k8sTypes';
import { ContainerResources, NodeSelector, Toleration } from '@odh-dashboard/internal/types';
import type {
  HardwarePodSpecOptionsState,
  PodSpecOptions,
} from '@odh-dashboard/internal/concepts/hardwareProfiles/types';

export const useModelServingHardwareProfileSection = (
  name?: string,
  resources?: ContainerResources,
  tolerations?: Toleration[],
  nodeSelector?: NodeSelector,
  namespace?: string,
  hardwareProfileNamespace?: string,
): UseHardwareProfileConfigResult => {
  const isProjectScoped = useIsAreaAvailable(SupportedArea.DS_PROJECT_SCOPED).status;

  return useHardwareProfileConfig(
    name,
    resources,
    tolerations,
    nodeSelector,
    [HardwareProfileFeatureVisibility.MODEL_SERVING],
    isProjectScoped ? namespace : undefined,
    hardwareProfileNamespace,
  );
};

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
      visibleIn={[HardwareProfileFeatureVisibility.MODEL_SERVING]}
    />
  );
};
