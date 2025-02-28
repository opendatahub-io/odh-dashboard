import React from 'react';
import { useIsAreaAvailable, SupportedArea } from '~/concepts/areas';
import { ContainerResources, NodeSelector, Toleration } from '~/types';
import { assemblePodSpecOptions } from '~/utilities/podSpec';
import { AcceleratorProfileKind, HardwareProfileKind } from '~/k8sTypes';
import useAcceleratorProfileFormState from '~/utilities/useAcceleratorProfileFormState';
import { useHardwareProfileConfig } from '~/concepts/hardwareProfiles/useHardwareProfileConfig';
import { PipelineVersionKF } from '~/concepts/pipelines/kfTypes';
import { CONTAINER_RESOURCE_DEFAULT } from './const';
import { getParamsValueFromPipelineInput } from './utils';

export type IlabPodSpecOptions = {
  resources: ContainerResources;
  tolerations?: Toleration[];
  nodeSelector?: NodeSelector;
  selectedAcceleratorProfile?: AcceleratorProfileKind;
  selectedHardwareProfile?: HardwareProfileKind;
};

export type SizeState = {
  selectedSize: ContainerResources;
  setSelectedSize: React.Dispatch<React.SetStateAction<ContainerResources>>;
};

export type IlabPodSpecOptionsState = {
  ContainerSize: SizeState;
  acceleratorProfile: ReturnType<typeof useAcceleratorProfileFormState>;
  hardwareProfile: ReturnType<typeof useHardwareProfileConfig>;
  podSpecOptions: IlabPodSpecOptions;
};

export const useIlabPodSpecOptionsState = (
  ilabPipelineVersion: PipelineVersionKF | null,
): IlabPodSpecOptionsState => {
  const [size, setSize] = React.useState<ContainerResources>(CONTAINER_RESOURCE_DEFAULT);

  // default value from pipeline spec
  React.useEffect(() => {
    if (ilabPipelineVersion) {
      const memoryValue = getParamsValueFromPipelineInput(
        ilabPipelineVersion,
        'train_memory_per_worker',
      );
      const cpuValue = getParamsValueFromPipelineInput(ilabPipelineVersion, 'train_cpu_per_worker');

      setSize((prevSize) => ({
        ...size,
        requests: {
          ...prevSize.requests,
          ...(memoryValue && { memory: String(memoryValue.defaultValue) }),
          ...(cpuValue && { cpu: String(cpuValue.defaultValue) }),
        },
      }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ilabPipelineVersion]);

  const acceleratorProfile = useAcceleratorProfileFormState();
  const hardwareProfile = useHardwareProfileConfig();

  const isHardwareProfilesAvailable = useIsAreaAvailable(SupportedArea.HARDWARE_PROFILES).status;

  let podSpecOptions: IlabPodSpecOptions = {
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
