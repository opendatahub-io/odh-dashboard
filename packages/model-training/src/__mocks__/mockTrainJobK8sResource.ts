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
  suspend = false,
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
  conditions = [
    {
      type: 'Created',
      status: 'True',
      lastTransitionTime: '2024-01-15T10:30:00Z',
      reason: 'TrainJobCreated',
      message: 'TrainJob test-train-job is created.',
    },
    {
      type: 'Running',
      status: 'True',
      lastTransitionTime: '2024-01-15T10:32:00Z',
      reason: 'TrainJobRunning',
      message: 'TrainJob test-train-job is running.',
    },
  ],
  jobsStatus = [
    {
      name: 'pytorch-job',
      active: status === TrainingJobState.RUNNING ? numNodes : 0,
      succeeded: status === TrainingJobState.SUCCEEDED ? numNodes : 0,
      failed: status === TrainingJobState.FAILED ? 1 : 0,
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

  return _.merge(
    {
      apiVersion: 'trainer.kubeflow.org/v1alpha1',
      kind: 'TrainJob',
      metadata: {
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
      },
      spec: {
        runtimeRef,
        suspend,
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
