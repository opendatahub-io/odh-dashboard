import { ClusterQueueKind } from '~/k8sTypes';
import { genUID } from '~/__mocks__/mockUtils';

type MockResourceConfigType = {
  name?: string;
};

export const mockClusterQueueK8sResource = ({
  name = 'test-cluster-queue',
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
    flavorFungibility: {
      whenCanBorrow: 'Borrow',
      whenCanPreempt: 'TryNextFlavor',
    },
    namespaceSelector: {},
    preemption: {
      borrowWithinCohort: {
        policy: 'Never',
      },
      reclaimWithinCohort: 'Never',
      withinClusterQueue: 'Never',
    },
    queueingStrategy: 'BestEffortFIFO',
    resourceGroups: [
      {
        coveredResources: ['cpu', 'memory'],
        flavors: [
          {
            name: 'test-flavor',
            resources: [
              {
                name: 'cpu',
                nominalQuota: '20',
              },
              {
                name: 'memory',
                nominalQuota: '36Gi',
              },
            ],
          },
        ],
      },
    ],
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
            borrowed: '0',
            name: 'cpu',
            total: '0',
          },
          {
            borrowed: '0',
            name: 'memory',
            total: '0',
          },
        ],
      },
    ],
    flavorsUsage: [
      {
        name: 'test-flavor',
        resources: [
          {
            borrowed: '0',
            name: 'cpu',
            total: '0',
          },
          {
            borrowed: '0',
            name: 'memory',
            total: '0',
          },
        ],
      },
    ],
    pendingWorkloads: 0,
    reservingWorkloads: 0,
  },
});
