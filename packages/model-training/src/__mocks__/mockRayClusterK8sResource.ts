import { genUID } from '@odh-dashboard/internal/__mocks__/mockUtils';
import { RayClusterKind } from '@odh-dashboard/model-training/k8sTypes';

type MockRayClusterConfigType = {
  name?: string;
  namespace?: string;
  uid?: string;
  rayVersion?: string;
  state?: string;
  workerReplicas?: number;
};

export const mockRayClusterK8sResource = ({
  name = 'test-ray-cluster',
  namespace = 'test-project',
  uid = genUID('ray-cluster'),
  rayVersion = '2.9.0',
  state = 'ready',
  workerReplicas = 1,
}: MockRayClusterConfigType = {}): RayClusterKind => ({
  apiVersion: 'ray.io/v1',
  kind: 'RayCluster',
  metadata: {
    name,
    namespace,
    uid,
  },
  spec: {
    rayVersion,
    headGroupSpec: { template: {} },
    workerGroupSpecs: [
      {
        groupName: 'default-worker',
        replicas: workerReplicas,
        template: {},
      },
    ],
  },
  status: {
    state,
    desiredWorkerReplicas: workerReplicas,
    availableWorkerReplicas: workerReplicas,
    readyWorkerReplicas: workerReplicas,
  },
});
