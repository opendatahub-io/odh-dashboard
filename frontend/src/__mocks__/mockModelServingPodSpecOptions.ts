import { ModelServingPodSpecOptions } from '#~/concepts/hardwareProfiles/useModelServingPodSpecOptionsState';

type MockResourceConfigType = Partial<ModelServingPodSpecOptions>;

export const mockModelServingPodSpecOptions = ({
  resources = {
    requests: {
      cpu: '1',
      memory: '1Gi',
    },
    limits: {
      cpu: '1',
      memory: '1Gi',
    },
  },
  tolerations = [],
  nodeSelector = {},
  selectedAcceleratorProfile,
  selectedHardwareProfile,
  selectedModelSize = {
    name: 'small',
    resources: {
      requests: {
        cpu: '1',
        memory: '1Gi',
      },
      limits: {
        cpu: '1',
        memory: '1Gi',
      },
    },
  },
}: MockResourceConfigType): ModelServingPodSpecOptions => ({
  resources,
  tolerations,
  nodeSelector,
  selectedAcceleratorProfile,
  selectedHardwareProfile,
  selectedModelSize,
});
