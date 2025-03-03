import React from 'react';
import { useIsAreaAvailable, SupportedArea } from '~/concepts/areas';
import { ContainerResources, NodeSelector, Toleration } from '~/types';
import { assemblePodSpecOptions } from '~/utilities/podSpec';
import { AcceleratorProfileKind, HardwareProfileKind } from '~/k8sTypes';
import useServingAcceleratorProfileFormState from '~/pages/modelServing/screens/projects/useServingAcceleratorProfileFormState';
import { ModelServingSize } from '~/pages/modelServing/screens/types';
import useServingHardwareProfileConfig from '~/concepts/hardwareProfiles/useServingHardwareProfileConfig';
import useAcceleratorProfileFormState from '~/utilities/useAcceleratorProfileFormState';
import { useHardwareProfileConfig } from '~/concepts/hardwareProfiles/useHardwareProfileConfig';
import { CONTAINER_RESOURCE_DEFAULT } from './const';

export type PodSpecOptions = {
  resources: ContainerResources;
  tolerations?: Toleration[];
  nodeSelector?: NodeSelector;
  selectedAcceleratorProfile?: AcceleratorProfileKind;
  selectedHardwareProfile?: HardwareProfileKind;
  selectedModelSize?: ModelServingSize;
};

export type SizeState = {
  selectedSize: ContainerResources;
  setSelectedSize: React.Dispatch<React.SetStateAction<ContainerResources>>;
};

export type PodSpecOptionsState = {
  ContainerSize: SizeState;
  acceleratorProfile: ReturnType<typeof useServingAcceleratorProfileFormState>;
  hardwareProfile: ReturnType<typeof useServingHardwareProfileConfig>;
  podSpecOptions: PodSpecOptions;
};

export const usePodSpecOptionsState = (): PodSpecOptionsState => {
  const [size, setSize] = React.useState<ContainerResources>(CONTAINER_RESOURCE_DEFAULT);

  const acceleratorProfile = useAcceleratorProfileFormState();
  const hardwareProfile = useHardwareProfileConfig();

  const isHardwareProfilesAvailable = useIsAreaAvailable(SupportedArea.HARDWARE_PROFILES).status;

  let podSpecOptions: PodSpecOptions = {
    resources: {},
    tolerations: undefined,
    nodeSelector: undefined,
  };

  const annotationData = {
    selectedAcceleratorProfile: acceleratorProfile.formData.profile,
    selectedHardwareProfile: hardwareProfile.formData.selectedProfile,
  };

  if (isHardwareProfilesAvailable) {
    podSpecOptions = {
      resources: hardwareProfile.formData.resources,
      tolerations: hardwareProfile.formData.selectedProfile?.spec.tolerations,
      nodeSelector: hardwareProfile.formData.selectedProfile?.spec.nodeSelector,
      ...annotationData,
    };
  } else {
    const resourceSettings: ContainerResources = {
      requests: {
        cpu: size.requests?.cpu,
        memory: size.requests?.memory,
      },
      limits: {
        cpu: size.limits?.cpu,
        memory: size.limits?.memory,
      },
    };

    const { tolerations: newTolerations, resources: newResources } = assemblePodSpecOptions(
      resourceSettings,
      acceleratorProfile.initialState,
      acceleratorProfile.formData,
      undefined,
      undefined,
      undefined,
      undefined,
    );

    podSpecOptions = {
      resources: newResources,
      tolerations: newTolerations,
      nodeSelector: {},
      ...annotationData,
    };
  }

  return {
    ContainerSize: {
      selectedSize: size,
      setSelectedSize: setSize,
    },
    acceleratorProfile,
    hardwareProfile,
    podSpecOptions,
  };
};
