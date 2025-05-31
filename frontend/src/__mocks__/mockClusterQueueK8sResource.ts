import { ClusterQueueKind } from '#~/k8sTypes';
import { genUID } from '#~/__mocks__/mockUtils';
import { ContainerResourceAttributes } from '#~/types';

type MockResourceConfigType = {
  name?: string;
  hasResourceGroups?: boolean;
  isCpuOverQuota?: boolean;
  isMemoryOverQuota?: boolean;
};

export const mockClusterQueueK8sResource = ({
  name = 'test-cluster-queue',
  hasResourceGroups = true,
  isCpuOverQuota = false,
  isMemoryOverQuota = false,
}: MockResourceConfigType): ClusterQueueKind => ({
  apiVersion: 'kueue.x-k8s.io/v1beta1',
  kind: 'ClusterQueue',
  metadata: {
    creationTimestamp: '2024-02-22T17:26:19Z',
    finalizers: ['kueue.x-k8s.io/resource-in-use'],
    generation: 1,
    name,
    uid: genUID('clusterqueue'),
  },
  spec: {
    flavorFungibility: { whenCanBorrow: 'Borrow', whenCanPreempt: 'TryNextFlavor' },
    namespaceSelector: {},
    preemption: {
      borrowWithinCohort: { policy: 'Never' },
      reclaimWithinCohort: 'Never',
      withinClusterQueue: 'Never',
    },
    queueingStrategy: 'BestEffortFIFO',
    resourceGroups: hasResourceGroups
      ? [
          {
            coveredResources: [ContainerResourceAttributes.CPU, ContainerResourceAttributes.MEMORY],
            flavors: [
              {
                name: 'test-flavor',
                resources: [
                  { name: ContainerResourceAttributes.CPU, nominalQuota: '100' },
                  { name: ContainerResourceAttributes.MEMORY, nominalQuota: '64Gi' },
                ],
              },
            ],
          },
        ]
      : [],
    stopPolicy: 'None',
  },
  status: {
    admittedWorkloads: 0,
    conditions: [
      {
        lastTransitionTime: '2024-02-22T17:26:19Z',
        message: 'Can admit new workloads',
        reason: 'Ready',
        status: 'True',
        type: 'Active',
      },
    ],
    flavorsReservation: [
      {
        name: 'test-flavor',
        resources: [
          {
            name: ContainerResourceAttributes.CPU,
            borrowed: '0',
            total: isCpuOverQuota ? '180' : '40',
          },
          {
            name: ContainerResourceAttributes.MEMORY,
            borrowed: '0',
            total: isMemoryOverQuota ? '100Gi' : '20Gi',
          },
        ],
      },
    ],
    flavorsUsage: [
      {
        name: 'test-flavor',
        resources: [
          {
            name: ContainerResourceAttributes.CPU,
            borrowed: '0',
            total: isCpuOverQuota ? '180' : '40',
          },
          {
            name: ContainerResourceAttributes.MEMORY,
            borrowed: '0',
            total: isMemoryOverQuota ? '100Gi' : '20Gi',
          },
        ],
      },
    ],
    pendingWorkloads: 0,
    reservingWorkloads: 0,
  },
});
