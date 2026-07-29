import { ContainerResourceAttributes } from '@odh-dashboard/k8s-core';
import { ClusterQueueKind } from '#~/k8sTypes';
import { genUID } from '#~/__mocks__/mockUtils';

type MockResourceConfigType = {
  name?: string;
  cohortName?: string;
  hasResourceGroups?: boolean;
  isCpuOverQuota?: boolean;
  isMemoryOverQuota?: boolean;
  gpuFlavorName?: string;
  gpuNominalQuota?: number;
  gpuUsed?: number;
  gpuBorrowed?: number;
  admittedWorkloads?: number;
  pendingWorkloads?: number;
};

export const mockClusterQueueK8sResource = ({
  name = 'test-cluster-queue',
  cohortName,
  hasResourceGroups = true,
  isCpuOverQuota = false,
  isMemoryOverQuota = false,
  gpuFlavorName,
  gpuNominalQuota = 8,
  gpuUsed = 0,
  gpuBorrowed = 0,
  admittedWorkloads = 0,
  pendingWorkloads = 0,
}: MockResourceConfigType): ClusterQueueKind => ({
  apiVersion: 'kueue.x-k8s.io/v1beta2',
  kind: 'ClusterQueue',
  metadata: {
    creationTimestamp: '2024-02-22T17:26:19Z',
    finalizers: ['kueue.x-k8s.io/resource-in-use'],
    generation: 1,
    name,
    uid: genUID('clusterqueue'),
  },
  spec: {
    ...(cohortName && { cohortName }),
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
          ...(gpuFlavorName
            ? [
                {
                  coveredResources: ['nvidia.com/gpu' as ContainerResourceAttributes],
                  flavors: [
                    {
                      name: gpuFlavorName,
                      resources: [
                        {
                          name: 'nvidia.com/gpu' as ContainerResourceAttributes,
                          nominalQuota: String(gpuNominalQuota),
                        },
                      ],
                    },
                  ],
                },
              ]
            : []),
        ]
      : [],
    stopPolicy: 'None',
  },
  status: {
    admittedWorkloads,
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
      ...(gpuFlavorName
        ? [
            {
              name: gpuFlavorName,
              resources: [
                {
                  name: 'nvidia.com/gpu' as ContainerResourceAttributes,
                  borrowed: String(gpuBorrowed),
                  total: String(gpuUsed),
                },
              ],
            },
          ]
        : []),
    ],
    pendingWorkloads,
    reservingWorkloads: 0,
  },
});
