import { LocalQueueKind } from '#~/k8sTypes';
import { genUID } from '#~/__mocks__/mockUtils';
import { ContainerResourceAttributes } from '#~/types';

type MockResourceConfigType = {
  name?: string;
  namespace?: string;
  isCpuOverQuota?: boolean;
  isMemoryOverQuota?: boolean;
};

export const mockLocalQueueK8sResource = ({
  name = 'test-local-queue',
  namespace = 'test-project',
  isCpuOverQuota = false,
  isMemoryOverQuota = false,
}: MockResourceConfigType): LocalQueueKind => ({
  apiVersion: 'kueue.x-k8s.io/v1beta1',
  kind: 'LocalQueue',
  metadata: {
    creationTimestamp: '2024-03-26T14:12:10Z',
    generation: 1,
    name,
    namespace,
    uid: genUID('localqueue'),
  },
  spec: {
    clusterQueue: 'test-cluster-queue',
  },
  status: {
    pendingWorkloads: 0,
    reservingWorkloads: 0,
    admittedWorkloads: 0,
    conditions: [
      {
        lastTransitionTime: '2024-03-26T15:49:12Z',
        message: 'Can submit new workloads to clusterQueue',
        reason: 'Ready',
        status: 'True',
        type: 'Active',
      },
    ],
    flavorUsage: [
      {
        name: 'test-flavor',
        resources: [
          {
            name: ContainerResourceAttributes.CPU,
            total: isCpuOverQuota ? '180' : '20',
          },
          {
            name: ContainerResourceAttributes.MEMORY,
            total: isMemoryOverQuota ? '100Gi' : '10Gi',
          },
        ],
      },
    ],
    flavorsReservation: [
      {
        name: 'test-flavor',
        resources: [
          {
            name: ContainerResourceAttributes.CPU,
            total: isCpuOverQuota ? '180' : '20',
          },
          {
            name: ContainerResourceAttributes.MEMORY,
            total: isMemoryOverQuota ? '100Gi' : '10Gi',
          },
        ],
      },
    ],
  },
});
