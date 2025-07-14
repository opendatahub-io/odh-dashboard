import { genUID } from '#~/__mocks__/mockUtils';
import { WorkloadStatusType } from '#~/concepts/distributedWorkloads/utils';
import { WorkloadCondition, WorkloadKind, WorkloadOwnerType, WorkloadPodSet } from '#~/k8sTypes';

const mockWorkloadStatusConditions: Record<WorkloadStatusType, WorkloadCondition[]> = {
  Pending: [
    {
      lastTransitionTime: '2024-03-18T19:15:28Z',
      message: 'Waiting for resources',
      reason: '',
      status: 'False',
      type: 'QuotaReserved',
    },
  ],
  Inadmissible: [
    {
      lastTransitionTime: '2024-03-18T19:15:28Z',
      message: 'The workload is inadmissible',
      reason: 'Inadmissible',
      status: 'False',
      type: 'QuotaReserved',
    },
  ],
  Admitted: [
    {
      lastTransitionTime: '2024-03-18T19:15:28Z',
      message: 'The workload is admitted',
      reason: 'Admitted',
      status: 'True',
      type: 'Admitted',
    },
  ],
  Running: [
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
      lastTransitionTime: '2024-03-18T19:15:28Z',
      message: 'The workload is running',
      reason: 'PodsReady',
      status: 'True',
      type: 'PodsReady',
    },
  ],
  Evicted: [
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
      lastTransitionTime: '2024-03-18T19:15:28Z',
      message: 'The workload is evicted',
      reason: 'Evicted',
      status: 'True',
      type: 'Evicted',
    },
  ],
  Succeeded: [
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
  Failed: [
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
      message: 'There was an error',
      reason: 'Failed',
      status: 'True',
      type: 'Finished',
    },
  ],
};

const mockWorkloadEmptySucceedCondition: Record<WorkloadStatusType.Succeeded, WorkloadCondition[]> =
  {
    [WorkloadStatusType.Succeeded]: [
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
        message: '',
        reason: 'Succeeded',
        status: 'True',
        type: 'Finished',
      },
    ],
  };
type MockResourceConfigType = {
  k8sName?: string;
  namespace?: string;
  ownerKind?: WorkloadOwnerType;
  ownerName?: string;
  mockStatus?: WorkloadStatusType | null;
  podSets?: WorkloadPodSet[];
  mockStatusEmptyWorkload?: boolean;
};
export const mockWorkloadK8sResource = ({
  k8sName = 'test-workload',
  namespace = 'test-project',
  ownerKind = WorkloadOwnerType.Job,
  ownerName,
  mockStatus = WorkloadStatusType.Succeeded,
  podSets = [],
  mockStatusEmptyWorkload = false,
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
    ...(ownerName
      ? {
          ownerReferences: [
            {
              apiVersion: 'batch/v1',
              blockOwnerDeletion: true,
              controller: true,
              kind: ownerKind,
              name: ownerName,
              uid: genUID(ownerKind.toLowerCase()),
            },
          ],
        }
      : {}),
  },
  spec: {
    active: true,
    podSets,
    priority: 0,
    queueName: 'user-queue',
  },
  status: {
    conditions: mockStatus
      ? mockStatusEmptyWorkload
        ? mockWorkloadEmptySucceedCondition[WorkloadStatusType.Succeeded]
        : mockWorkloadStatusConditions[mockStatus]
      : [],
  },
});
