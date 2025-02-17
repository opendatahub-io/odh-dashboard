import React from 'react';
import { useIsAreaAvailable, SupportedArea } from '~/concepts/areas';
import { ContainerResources, NodeSelector, Toleration } from '~/types';
import { assemblePodSpecOptions } from '~/utilities/podSpec';
import {
  AcceleratorProfileKind,
  HardwareProfileKind,
  InferenceServiceKind,
  ServingRuntimeKind,
} from '~/k8sTypes';
import useServingAcceleratorProfileFormState from '~/pages/modelServing/screens/projects/useServingAcceleratorProfileFormState';
import { useAppContext } from '~/app/AppContext';
import { getServingRuntimeSizes, isGpuDisabled } from '~/pages/modelServing/screens/projects/utils';
import { useDeepCompareMemoize } from '~/utilities/useDeepCompareMemoize';
import { ModelServingSize } from '~/pages/modelServing/screens/types';
import { getInferenceServiceSize } from '~/pages/modelServing/utils';
import useServingHardwareProfileConfig from './useServingHardwareProfileConfig';

export type ModelServingPodSpecOptions = {
  resources: ContainerResources;
  tolerations?: Toleration[];
  nodeSelector?: NodeSelector;
  selectedAcceleratorProfile?: AcceleratorProfileKind;
  selectedHardwareProfile?: HardwareProfileKind;
  selectedModelSize?: ModelServingSize;
};

export type ModelServingSizeState = {
  sizes: ModelServingSize[];
  selectedSize: ModelServingSize;
  setSelectedSize: (modelSize: ModelServingSize) => void;
};

export type ModelServingPodSpecOptionsState = {
  modelSize: ModelServingSizeState;
  acceleratorProfile: ReturnType<typeof useServingAcceleratorProfileFormState>;
  hardwareProfile: ReturnType<typeof useServingHardwareProfileConfig>;
  podSpecOptions: ModelServingPodSpecOptions;
};

export const useModelServingPodSpecOptionsState = (
  servingRuntime?: ServingRuntimeKind,
  inferenceService?: InferenceServiceKind,
): ModelServingPodSpecOptionsState => {
  const { dashboardConfig } = useAppContext();
  const sizes = useDeepCompareMemoize(getServingRuntimeSizes(dashboardConfig));
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
  const hardwareProfile = useServingHardwareProfileConfig(servingRuntime, inferenceService);

  // Handle GPU disabled state
  const controlledAcceleratorProfile = {
    ...acceleratorProfile,
    formData:
      servingRuntime && isGpuDisabled(servingRuntime)
        ? { count: 0, useExistingSettings: false }
        : acceleratorProfile.formData,
  };

  const isHardwareProfilesAvailable = useIsAreaAvailable(SupportedArea.HARDWARE_PROFILES).status;

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
    selectedAcceleratorProfile: acceleratorProfile.formData.profile,
    selectedHardwareProfile: hardwareProfile.formData.selectedProfile,
  };

  if (isHardwareProfilesAvailable) {
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
        tolerations: hardwareProfile.formData.selectedProfile?.spec.tolerations,
        nodeSelector: hardwareProfile.formData.selectedProfile?.spec.nodeSelector,
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
      undefined,
      existingTolerations,
      undefined,
      existingResources,
    );

    podSpecOptions = {
      resources: newResources,
      tolerations: newTolerations,
      nodeSelector: existingNodeSelector,
      ...annotationData,
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
