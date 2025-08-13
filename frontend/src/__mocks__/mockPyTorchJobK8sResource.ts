import * as _ from 'lodash-es';
import { genUID } from './mockUtils';
import { PyTorchJobKind } from '../../packages/model-training/src/k8sTypes';
import { PyTorchJobState } from '../../packages/model-training/src/types';

type MockResourceConfigType = {
  name?: string;
  namespace?: string;
  uid?: string;
  creationTimestamp?: string;
  image?: string;
  masterReplicas?: number;
  workerReplicas?: number;
  status?: PyTorchJobState;
  localQueueName?: string;
  gpuLimit?: number;
  cpuLimit?: string;
  memoryLimit?: string;
  cpuRequest?: string;
  memoryRequest?: string;
  args?: string[];
  conditions?: Array<{
    type: string;
    status: string;
    lastUpdateTime?: string;
    lastTransitionTime?: string;
    reason?: string;
    message?: string;
  }>;
  replicaStatuses?: {
    Master?: {
      active?: number;
      succeeded?: number;
      failed?: number;
    };
    Worker?: {
      active?: number;
      succeeded?: number;
      failed?: number;
    };
  };
  startTime?: string;
  completionTime?: string;
  additionalLabels?: Record<string, string>;
};

export const mockPyTorchJobK8sResource = ({
  name = 'test-pytorch-job',
  namespace = 'test-project',
  uid = genUID('pytorch-job'),
  creationTimestamp = '2024-01-15T10:30:00Z',
  image = 'pytorch/pytorch:2.0.0-cuda11.7-cudnn8-devel',
  masterReplicas = 1,
  workerReplicas = 2,
  status = PyTorchJobState.RUNNING,
  localQueueName = 'default-queue',
  gpuLimit = 1,
  cpuLimit = '2',
  memoryLimit = '4Gi',
  cpuRequest = '1',
  memoryRequest = '2Gi',
  args = ['python', 'train.py'],
  conditions = [
    {
      type: 'Created',
      status: 'True',
      lastUpdateTime: '2024-01-15T10:30:00Z',
      lastTransitionTime: '2024-01-15T10:30:00Z',
      reason: 'PyTorchJobCreated',
      message: 'PyTorchJob test-pytorch-job is created.',
    },
    {
      type: 'Running',
      status: 'True',
      lastUpdateTime: '2024-01-15T10:32:00Z',
      lastTransitionTime: '2024-01-15T10:32:00Z',
      reason: 'PyTorchJobRunning',
      message: 'PyTorchJob test-pytorch-job is running.',
    },
  ],
  replicaStatuses = {
    Master: {
      active: status === PyTorchJobState.RUNNING ? 1 : 0,
      succeeded: status === PyTorchJobState.SUCCEEDED ? 1 : 0,
      failed: status === PyTorchJobState.FAILED ? 1 : 0,
    },
    Worker: {
      active: status === PyTorchJobState.RUNNING ? workerReplicas : 0,
      succeeded: status === PyTorchJobState.SUCCEEDED ? workerReplicas : 0,
      failed: status === PyTorchJobState.FAILED ? workerReplicas : 0,
    },
  },
  startTime = status === PyTorchJobState.PENDING ? undefined : '2024-01-15T10:32:00Z',
  completionTime = status === PyTorchJobState.SUCCEEDED || status === PyTorchJobState.FAILED
    ? '2024-01-15T11:30:00Z'
    : undefined,
  additionalLabels = {},
}: MockResourceConfigType = {}): PyTorchJobKind => {
  const baseLabels = {
    'kueue.x-k8s.io/queue-name': localQueueName,
    'app.kubernetes.io/name': 'pytorch-job',
    'app.kubernetes.io/component': 'training',
    ...additionalLabels,
  };

  return _.merge(
    {
      apiVersion: 'kubeflow.org/v1',
      kind: 'PyTorchJob',
      metadata: {
        name,
        namespace,
        uid,
        creationTimestamp,
        labels: baseLabels,
        resourceVersion: '12345',
        generation: 1,
      },
      spec: {
        pytorchReplicaSpecs: {
          Master: {
            replicas: masterReplicas,
            restartPolicy: 'OnFailure',
            template: {
              spec: {
                containers: [
                  {
                    name: 'pytorch',
                    image,
                    args,
                    resources: {
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
                ],
              },
            },
          },
          Worker: {
            replicas: workerReplicas,
            restartPolicy: 'OnFailure',
            template: {
              spec: {
                containers: [
                  {
                    name: 'pytorch',
                    image,
                    args,
                    resources: {
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
                ],
              },
            },
          },
        },
      },
      status: {
        conditions,
        replicaStatuses,
        startTime,
        completionTime,
      },
    },
    {},
  );
};

export const mockPyTorchJobK8sResourceList = (
  configs: MockResourceConfigType[] = [],
): PyTorchJobKind[] => configs.map((config) => mockPyTorchJobK8sResource(config));
