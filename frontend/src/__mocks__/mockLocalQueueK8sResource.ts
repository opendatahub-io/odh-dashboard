import { LocalQueueKind } from '~/k8sTypes';
import { genUID } from '~/__mocks__/mockUtils';

type MockResourceConfigType = {
  name?: string;
  namespace?: string;
};

export const mockLocalQueueK8sResource = ({
  name = 'test-local-queue',
  namespace = 'test-project',
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
          { name: 'cpu', total: '0' },
          { name: 'memory', total: '0' },
          { name: 'nvidia.com/gpu', total: '0' },
        ],
      },
    ],
    flavorsReservation: [
      {
        name: 'test-flavor',
        resources: [
          { name: 'cpu', total: '0' },
          { name: 'memory', total: '0' },
          { name: 'nvidia.com/gpu', total: '0' },
        ],
      },
    ],
  },
});
