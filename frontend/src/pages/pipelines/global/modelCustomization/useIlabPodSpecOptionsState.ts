import React from 'react';
import { useIsAreaAvailable, SupportedArea } from '#~/concepts/areas';
import { ContainerResources, NodeSelector, Toleration } from '#~/types';
import { AcceleratorProfileKind, HardwareProfileKind } from '#~/k8sTypes';
import useAcceleratorProfileFormState from '#~/utilities/useAcceleratorProfileFormState';
import { useHardwareProfileConfig } from '#~/concepts/hardwareProfiles/useHardwareProfileConfig';
import { PipelineVersionKF } from '#~/concepts/pipelines/kfTypes';
import { HardwareFormData } from '#~/concepts/pipelines/content/modelCustomizationForm/modelCustomizationFormSchema/validationUtils';
import { CONTAINER_RESOURCE_DEFAULT, KnownFineTuningPipelineParameters } from './const';
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
  containerSize: SizeState;
  acceleratorProfile: ReturnType<typeof useAcceleratorProfileFormState>;
  hardwareProfile: ReturnType<typeof useHardwareProfileConfig>;
};

export const useIlabPodSpecOptionsState = (
  ilabPipelineVersion: PipelineVersionKF | null,
  setHardwareFormData: (data: HardwareFormData) => void,
): IlabPodSpecOptionsState => {
  const [size, setSize] = React.useState<ContainerResources>(CONTAINER_RESOURCE_DEFAULT);

  // default value from pipeline spec
  React.useEffect(() => {
    if (ilabPipelineVersion) {
      const memoryValue = getParamsValueFromPipelineInput(
        ilabPipelineVersion,
        KnownFineTuningPipelineParameters.TRAIN_MEMORY_PER_WORKER,
      );
      const cpuValue = getParamsValueFromPipelineInput(
        ilabPipelineVersion,
        KnownFineTuningPipelineParameters.TRAIN_CPU_PER_WORKER,
      );

      setSize((prevSize) => ({
        ...prevSize,
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

  React.useEffect(() => {
    let podSpecOptions: IlabPodSpecOptions = {
      resources: {},
      tolerations: undefined,
      nodeSelector: undefined,
    };

    if (isHardwareProfilesAvailable) {
      podSpecOptions = {
        resources: hardwareProfile.formData.resources ?? {},
        tolerations: hardwareProfile.formData.selectedProfile?.spec.scheduling?.node?.tolerations,
        nodeSelector: hardwareProfile.formData.selectedProfile?.spec.scheduling?.node?.nodeSelector,
      };
    } else if (acceleratorProfile.formData.profile?.spec.identifier) {
      const resources: ContainerResources = {
        requests: {
          cpu: size.requests?.cpu,
          memory: size.requests?.memory,
          [acceleratorProfile.formData.profile.spec.identifier]: acceleratorProfile.formData.count,
        },
      };
      podSpecOptions = {
        resources,
        tolerations: acceleratorProfile.formData.profile.spec.tolerations,
        nodeSelector: {},
      };
    }
    const otherHardwareIdentifier =
      hardwareProfile.formData.selectedProfile?.spec.identifiers?.find(
        (i) => i.identifier !== 'cpu' && i.identifier !== 'memory',
      );

    const otherHardwareValue = otherHardwareIdentifier
      ? Number(podSpecOptions.resources.requests?.[otherHardwareIdentifier.identifier])
      : undefined;

    const otherHardwareAcceleratorIdentifier = acceleratorProfile.formData.profile?.spec.identifier;
    const otherHardwareAcceleratorValue = otherHardwareAcceleratorIdentifier
      ? Number(podSpecOptions.resources.requests?.[otherHardwareAcceleratorIdentifier])
      : undefined;

    setHardwareFormData({
      podSpecOptions: {
        cpuCount: podSpecOptions.resources.requests?.cpu ?? 0,
        memoryCount: podSpecOptions.resources.requests?.memory ?? '0',
        gpuCount: otherHardwareValue ?? otherHardwareAcceleratorValue ?? 0,
        gpuIdentifier:
          otherHardwareIdentifier?.identifier ?? otherHardwareAcceleratorIdentifier ?? '',
        tolerations: podSpecOptions.tolerations,
        nodeSelector: podSpecOptions.nodeSelector,
      },
      acceleratorProfileConfig: acceleratorProfile.formData,
      hardwareProfileConfig: {
        ...hardwareProfile.formData,
        resources: {
          requests: hardwareProfile.formData.resources?.requests ?? {},
          limits: hardwareProfile.formData.resources?.limits ?? {},
        },
      },
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    isHardwareProfilesAvailable,
    acceleratorProfile.formData,
    hardwareProfile.formData,
    size.requests?.cpu,
    size.requests?.memory,
  ]);

  return {
    containerSize: {
      selectedSize: size,
      setSelectedSize: setSize,
    },
    acceleratorProfile,
    hardwareProfile,
  };
};
