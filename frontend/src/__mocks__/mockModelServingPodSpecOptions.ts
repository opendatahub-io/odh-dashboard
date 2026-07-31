import type { ModelServingPodSpecOptions } from '@odh-dashboard/hardware-profiles/shared';

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
  selectedHardwareProfile,
  selectedModelSize,
});
