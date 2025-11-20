/* eslint-disable camelcase */
import * as _ from 'lodash-es';
import { genUID } from '@odh-dashboard/internal/__mocks__/mockUtils';
import { TrainJobKind, TrainerStatus } from '@odh-dashboard/model-training/k8sTypes';
import { TrainingJobState } from '@odh-dashboard/model-training/types';

type MockResourceConfigType = {
  name?: string;
  namespace?: string;
  uid?: string;
  creationTimestamp?: string;
  numNodes?: number;
  numProcPerNode?: number;
  status?: TrainingJobState;
  localQueueName?: string;
  suspend?: boolean;
  gpuLimit?: number;
  cpuLimit?: string;
  memoryLimit?: string;
  cpuRequest?: string;
  memoryRequest?: string;
  runtimeRef?: {
    apiGroup: string;
    kind: string;
    name: string;
  };
  conditions?: Array<{
    type: string;
    status: string;
    lastTransitionTime?: string;
    reason?: string;
    message?: string;
  }>;
  jobsStatus?: Array<{
    name: string;
    active?: number;
    failed?: number;
    ready?: number;
    succeeded?: number;
    suspended?: number;
  }>;
  trainerStatus?: TrainerStatus;
  additionalLabels?: Record<string, string>;
};

export const mockTrainJobK8sResource = ({
  name = 'test-train-job',
  namespace = 'test-project',
  uid = genUID('train-job'),
  creationTimestamp = '2024-01-15T10:30:00Z',
  numNodes = 3,
  numProcPerNode = 1,
  status = TrainingJobState.RUNNING,
  localQueueName = 'default-queue',
  suspend,
  gpuLimit = 1,
  cpuLimit = '2',
  memoryLimit = '4Gi',
  cpuRequest = '1',
  memoryRequest = '2Gi',
  runtimeRef = {
    apiGroup: 'kubeflow.org',
    kind: 'PyTorchRuntime',
    name: 'pytorch-runtime',
  },
  conditions = (() => {
    const baseTimestamp = creationTimestamp;
    const laterTimestamp = new Date(new Date(baseTimestamp).getTime() + 120000).toISOString();

    if (status === TrainingJobState.FAILED) {
      return [
        {
          type: 'Created',
          status: 'True',
          lastTransitionTime: baseTimestamp,
          reason: 'TrainJobCreated',
          message: 'TrainJob test-train-job is created.',
        },
        {
          type: 'Failed',
          status: 'True',
          lastTransitionTime: laterTimestamp,
          reason: 'TrainJobFailed',
          message: 'TrainJob test-train-job has failed.',
        },
      ];
    }
    if (status === TrainingJobState.SUCCEEDED) {
      return [
        {
          type: 'Created',
          status: 'True',
          lastTransitionTime: baseTimestamp,
          reason: 'TrainJobCreated',
          message: 'TrainJob test-train-job is created.',
        },
        {
          type: 'Succeeded',
          status: 'True',
          lastTransitionTime: laterTimestamp,
          reason: 'TrainJobSucceeded',
          message: 'TrainJob test-train-job has succeeded.',
        },
      ];
    }
    // For QUEUED, PENDING, PAUSED, and other non-terminal states, use Created condition
    // (QUEUED/PENDING/PAUSED status is determined by workload conditions or spec.suspend, not TrainJob conditions)
    if (
      status === TrainingJobState.QUEUED ||
      status === TrainingJobState.PENDING ||
      status === TrainingJobState.PAUSED ||
      status === TrainingJobState.INADMISSIBLE ||
      status === TrainingJobState.PREEMPTED
    ) {
      return [
        {
          type: 'Created',
          status: 'True',
          lastTransitionTime: baseTimestamp,
          reason: 'TrainJobCreated',
          message: 'TrainJob test-train-job is created.',
        },
      ];
    }
    // Running or other states (default)
    return [
      {
        type: 'Created',
        status: 'True',
        lastTransitionTime: baseTimestamp,
        reason: 'TrainJobCreated',
        message: 'TrainJob test-train-job is created.',
      },
      {
        type: 'Running',
        status: 'True',
        lastTransitionTime: laterTimestamp,
        reason: 'TrainJobRunning',
        message: 'TrainJob test-train-job is running.',
      },
    ];
  })(),

  jobsStatus = [
    {
      name: 'node',
      active: status === TrainingJobState.RUNNING ? numNodes : 0,
      succeeded: status === TrainingJobState.SUCCEEDED ? numNodes : 0,
      failed: status === TrainingJobState.FAILED ? 1 : 0,
      ready: status === TrainingJobState.RUNNING ? numNodes : 0,
      suspended: 0,
    },
  ],
  trainerStatus = {
    progressPercentage: 64,
    estimatedRemainingDurationSeconds: 1800,
    estimatedRemainingTimeSummary: '30 minutes',
    currentStep: 3000,
    totalSteps: 4690,
    currentEpoch: 3,
    totalEpochs: 5,
    trainMetrics: {
      loss: 0.2344,
      accuracy: 0.8993774,
      total_batches: 854,
      total_samples: 4000,
    },
    evalMetrics: null,
    lastUpdatedTime: '2024-01-15T10:45:00Z',
  },
  additionalLabels = {},
}: MockResourceConfigType = {}): TrainJobKind => {
  const baseLabels = {
    'kueue.x-k8s.io/queue-name': localQueueName,
    'app.kubernetes.io/name': 'train-job',
    'app.kubernetes.io/component': 'training',
    ...additionalLabels,
  };

  const metadata: TrainJobKind['metadata'] = {
    name,
    namespace,
    uid,
    creationTimestamp,
    labels: baseLabels,
    resourceVersion: '12345',
    generation: 1,
    annotations: {
      'opendatahub.io/display-name': name,
    },
  };

  // Add deletionTimestamp for DELETING status
  if (status === TrainingJobState.DELETING) {
    metadata.deletionTimestamp = new Date().toISOString();
  }

  return _.merge(
    {
      apiVersion: 'trainer.kubeflow.org/v1alpha1',
      kind: 'TrainJob',
      metadata,
      spec: {
        runtimeRef,
        ...(suspend !== undefined && { suspend }),
        trainer: {
          numNodes,
          numProcPerNode,
          resourcesPerNode: {
            limits: {
              'nvidia.com/gpu': gpuLimit,
              cpu: cpuLimit,
              memory: memoryLimit,
            },
            requests: {
              cpu: cpuRequest,
              memory: memoryRequest,
            },
          },
        },
      },
      status: {
        conditions,
        jobsStatus,
        trainerStatus,
      },
    },
    {},
  );
};

export const mockTrainJobK8sResourceList = (
  configs: MockResourceConfigType[] = [],
): TrainJobKind[] => configs.map((config) => mockTrainJobK8sResource(config));
