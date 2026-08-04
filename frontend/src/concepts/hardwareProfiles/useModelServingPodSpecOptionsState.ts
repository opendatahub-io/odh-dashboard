import React from 'react';
import { InferenceServiceKind, ServingRuntimeKind } from '@odh-dashboard/model-serving/shared';
import { useDeepCompareMemoize } from '@odh-dashboard/ui-core/hooks';
import type {
  ModelServingPodSpecOptions,
  ModelServingSizeState,
} from '@odh-dashboard/hardware-profiles/shared';
import { useAppContext } from '#~/app/AppContext';
import { getModelServingSizes } from '#~/concepts/modelServing/modelServingSizesUtils';
import { getInferenceServiceSize } from '#~/pages/modelServing/utils';
import useServingHardwareProfileConfig from './useServingHardwareProfileConfig';
import { HardwarePodSpecOptionsState } from './types';

export type ModelServingHardwareProfileState =
  HardwarePodSpecOptionsState<ModelServingPodSpecOptions> & {
    modelSize: ModelServingSizeState;
  };

export const useModelServingHardwareProfileState = (
  servingRuntime?: ServingRuntimeKind,
  inferenceService?: InferenceServiceKind,
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
