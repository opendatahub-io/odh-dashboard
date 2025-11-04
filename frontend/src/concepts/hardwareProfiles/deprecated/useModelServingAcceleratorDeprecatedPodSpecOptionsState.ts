import React from 'react';
import { ContainerResources } from '#~/types';
import { assemblePodSpecOptions } from '#~/utilities/podSpec';
import { InferenceServiceKind, ServingRuntimeKind } from '#~/k8sTypes';
import useServingAcceleratorProfileFormState from '#~/pages/modelServing/screens/projects/useServingAcceleratorProfileFormState';
import { useAppContext } from '#~/app/AppContext';
import { getModelServingSizes } from '#~/concepts/modelServing/modelServingSizesUtils';
import { useDeepCompareMemoize } from '#~/utilities/useDeepCompareMemoize';
import { getInferenceServiceSize } from '#~/pages/modelServing/utils';
import { isGpuDisabled } from '#~/pages/modelServing/screens/projects/utils';
import useServingHardwareProfileConfig from '#~/concepts/hardwareProfiles/useServingHardwareProfileConfig';
import { PodSpecOptionsAcceleratorState } from '#~/concepts/hardwareProfiles/types';
import {
  ModelServingPodSpecOptions,
  ModelServingSizeState,
} from '#~/concepts/hardwareProfiles/useModelServingPodSpecOptionsState';

export type ModelServingPodSpecOptionsState =
  PodSpecOptionsAcceleratorState<ModelServingPodSpecOptions> & {
    modelSize: ModelServingSizeState;
  };

// HERE: go through and find all the places that use this and replace with the new useServingHardwareProfileConfig
// todo:  get NIM set up so i can test it.

// every file that is *only* used by this file should be marked as deprecated.
// it will be marked as deprecated and with the label: accel-modelMesh-deprecated
// everything with this label can all be removed when the modelmesh classes are removed

/** @deprecated -- accelerator profiles are removed as of 3.0; and only modelmesh uses this (which is itself deprecated) */
export const useModelServingPodSpecOptionsState = (
  servingRuntime?: ServingRuntimeKind,
  inferenceService?: InferenceServiceKind,
  isModelMesh?: boolean,
): ModelServingPodSpecOptionsState => {
  const { dashboardConfig } = useAppContext();
  const sizes = useDeepCompareMemoize(getModelServingSizes(dashboardConfig));
  const existingSize = useDeepCompareMemoize(
    getInferenceServiceSize(sizes, inferenceService, servingRuntime),
  );
  const [modelSize, setModelSize] = React.useState(sizes[0]);

  // set initial model size
  React.useEffect(() => {
    if (inferenceService) {
      setModelSize(existingSize);
    }
  }, [inferenceService, existingSize]);

  const acceleratorProfile = useServingAcceleratorProfileFormState(
    servingRuntime,
    inferenceService,
  );
  const hardwareProfile = useServingHardwareProfileConfig(inferenceService);

  // Handle GPU disabled state
  const controlledAcceleratorProfile = {
    ...acceleratorProfile,
    formData:
      servingRuntime && isGpuDisabled(servingRuntime)
        ? { count: 0, useExistingSettings: false }
        : acceleratorProfile.formData,
  };

  let podSpecOptions: ModelServingPodSpecOptions = {
    resources: {},
    tolerations: undefined,
    nodeSelector: undefined,
  };

  const existingResources =
    inferenceService?.spec.predictor.model?.resources ||
    servingRuntime?.spec.containers[0].resources ||
    {};
  const existingTolerations =
    inferenceService?.spec.predictor.tolerations || servingRuntime?.spec.tolerations;
  const existingNodeSelector =
    inferenceService?.spec.predictor.nodeSelector || servingRuntime?.spec.nodeSelector;

  if (!isModelMesh) {
    const annotationData = {
      selectedHardwareProfile: hardwareProfile.formData.selectedProfile,
    };
    if (hardwareProfile.formData.useExistingSettings) {
      podSpecOptions = {
        resources: existingResources,
        tolerations: existingTolerations,
        nodeSelector: existingNodeSelector,
        ...annotationData,
      };
    } else {
      podSpecOptions = {
        resources: hardwareProfile.formData.resources,
        tolerations: hardwareProfile.formData.selectedProfile?.spec.scheduling?.node?.tolerations,
        nodeSelector: hardwareProfile.formData.selectedProfile?.spec.scheduling?.node?.nodeSelector,
        ...annotationData,
      };
    }
  } else {
    const resourceSettings: ContainerResources = {
      requests: {
        cpu: modelSize.resources.requests?.cpu,
        memory: modelSize.resources.requests?.memory,
      },
      limits: {
        cpu: modelSize.resources.limits?.cpu,
        memory: modelSize.resources.limits?.memory,
      },
    };

    const { tolerations: newTolerations, resources: newResources } = assemblePodSpecOptions(
      resourceSettings,
      acceleratorProfile.initialState,
      acceleratorProfile.formData,
      existingTolerations,
      undefined,
      existingResources,
    );

    podSpecOptions = {
      resources: newResources,
      tolerations: newTolerations,
      nodeSelector: existingNodeSelector,
      selectedAcceleratorProfile: acceleratorProfile.formData.profile,
    };
  }

  return {
    modelSize: {
      sizes,
      selectedSize: modelSize,
      setSelectedSize: setModelSize,
    },
    acceleratorProfile: controlledAcceleratorProfile,
    hardwareProfile,
    podSpecOptions,
  };
};
