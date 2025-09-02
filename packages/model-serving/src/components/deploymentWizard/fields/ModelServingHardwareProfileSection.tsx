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
  PodSpecOptions,
  PodSpecOptionsState,
} from '@odh-dashboard/internal/concepts/hardwareProfiles/types';
import type { UseAcceleratorProfileFormResult } from '@odh-dashboard/internal/utilities/useAcceleratorProfileFormState.js';

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

export const createAcceleratorProfileStub = (): UseAcceleratorProfileFormResult => ({
  initialState: {
    acceleratorProfiles: [],
    acceleratorProfile: undefined,
    count: 0,
    unknownProfileDetected: false,
  },
  formData: {
    profile: undefined,
    count: 0,
    useExistingSettings: false,
  },
  setFormData: () => {
    // No-op: accelerator profiles are deprecated
  },
  resetFormData: () => {
    // No-op: accelerator profiles are deprecated
  },
  loaded: true,
  loadError: undefined,
  refresh: () => Promise.resolve(undefined),
});

type ModelServingHardwareProfileSectionComponentProps = {
  hardwareProfileConfig: UseHardwareProfileConfigResult;
  project: string;
  isEditing?: boolean;
};

export const ModelServingHardwareProfileSection: React.FC<
  ModelServingHardwareProfileSectionComponentProps
> = ({ hardwareProfileConfig, project, isEditing = false }) => {
  const podSpecOptionsState: PodSpecOptionsState<PodSpecOptions> = React.useMemo(
    () => ({
      acceleratorProfile: {
        initialState: {
          acceleratorProfiles: [],
          acceleratorProfile: undefined,
          count: 0,
          unknownProfileDetected: false,
        },
        formData: {
          profile: undefined,
          count: 0,
          useExistingSettings: false,
        },
        setFormData: () => {
          // No-op: accelerator profiles are deprecated
        },
        resetFormData: () => {
          // No-op: accelerator profiles are deprecated
        },
        loaded: true,
        loadError: undefined,
        refresh: () => Promise.resolve(undefined),
      },
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
