import React from 'react';
import { ContainerResources } from '#~/types';
import { InferenceServiceKind, ServingRuntimeKind } from '#~/k8sTypes';
import { useAppContext } from '#~/app/AppContext';
import { getModelServingSizes } from '#~/concepts/modelServing/modelServingSizesUtils';
import { useDeepCompareMemoize } from '#~/utilities/useDeepCompareMemoize';
import { ModelServingSize } from '#~/pages/modelServing/screens/types';
import { getInferenceServiceSize } from '#~/pages/modelServing/utils';
import useServingHardwareProfileConfig from './useServingHardwareProfileConfig';
import { PodSpecOptions, HardwarePodSpecOptionsState } from './types';

export type ModelServingPodSpecOptions = PodSpecOptions & {
  selectedModelSize?: ModelServingSize;
};

export type ModelServingSizeState = {
  sizes: ModelServingSize[];
  selectedSize: ModelServingSize;
  setSelectedSize: (modelSize: ModelServingSize) => void;
};

export type ModelServingHardwareProfileState =
  HardwarePodSpecOptionsState<ModelServingPodSpecOptions> & {
    modelSize: ModelServingSizeState;
  };

export const useModelServingHardwareProfileState = (
  servingRuntime?: ServingRuntimeKind,
  inferenceService?: InferenceServiceKind,
  isModelMesh?: boolean,
): ModelServingHardwareProfileState => {
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

  const hardwareProfile = useServingHardwareProfileConfig(inferenceService);

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
    // For ModelMesh, use basic resource settings without accelerator profile
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

    podSpecOptions = {
      resources: resourceSettings,
      tolerations: existingTolerations,
      nodeSelector: existingNodeSelector,
    };
  }

  return {
    modelSize: {
      sizes,
      selectedSize: modelSize,
      setSelectedSize: setModelSize,
    },
    hardwareProfile,
    podSpecOptions,
  };
};
