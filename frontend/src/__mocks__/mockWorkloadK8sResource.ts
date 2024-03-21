import { genUID } from '~/__mocks__/mockUtils';
import { WorkloadKind } from '~/k8sTypes';

type MockResourceConfigType = {
  k8sName?: string;
  namespace?: string;
};
export const mockWorkloadK8sResource = ({
  k8sName = 'test-workload',
  namespace = 'test-project',
}: MockResourceConfigType): WorkloadKind => ({
  apiVersion: 'kueue.x-k8s.io/v1beta1',
  kind: 'Workload',
  metadata: {
    creationTimestamp: '2024-03-18T19:15:28Z',
    generation: 2,
    labels: {
      'kueue.x-k8s.io/job-uid': 'e62a44fb-cd94-4602-bc8b-7cc9579d9559',
    },
    name: k8sName,
    namespace,
    resourceVersion: '9279356',
    uid: genUID('workload'),
  },
  spec: {
    active: true,
    podSets: [],
    priority: 0,
    queueName: 'user-queue',
  },
  status: {
    conditions: [
      {
        lastTransitionTime: '2024-03-18T19:15:28Z',
        message: 'Quota reserved in ClusterQueue cluster-queue',
        reason: 'QuotaReserved',
        status: 'True',
        type: 'QuotaReserved',
      },
      {
        lastTransitionTime: '2024-03-18T19:15:28Z',
        message: 'The workload is admitted',
        reason: 'Admitted',
        status: 'True',
        type: 'Admitted',
      },
      {
        lastTransitionTime: '2024-03-18T19:17:15Z',
        message: 'Job finished successfully',
        reason: 'JobFinished',
        status: 'True',
        type: 'Finished',
      },
    ],
  },
});
