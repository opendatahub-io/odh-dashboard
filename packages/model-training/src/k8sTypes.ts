import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import { TRAINER_STATUS_ANNOTATION } from './const';

export interface TrainerStatus {
  progressPercentage?: number | null;
  estimatedRemainingSeconds?: number | null;
  currentStep?: number | null;
  totalSteps?: number | null;
  currentEpoch?: number | null;
  totalEpochs?: number | null;
  trainMetrics?: Record<string, string | number | null> | null;
  evalMetrics?: Record<string, string | number | null> | null;
  lastUpdatedTime?: string;
}

export type TrainJobKind = K8sResourceCommon & {
  metadata: {
    annotations?: Partial<{
      'opendatahub.io/display-name': string;
      [TRAINER_STATUS_ANNOTATION]?: string;
    }>;
    name: string;
    namespace: string;
    labels?: {
      'kueue.x-k8s.io/queue-name'?: string;
      [key: string]: string | undefined;
    };
    uid?: string;
  };
  spec: {
    managedBy?: string;
    runtimeRef: {
      apiGroup: string;
      kind: string;
      name: string;
    };
    suspend?: boolean;
    labels?: {
      'kueue.x-k8s.io/queue-name'?: string;
    };
    trainer?: {
      env?: Array<{
        name: string;
        value: string;
      }>;
      numNodes: number;
      numProcPerNode?: number;
      resourcesPerNode?: {
        limits?: {
          cpu?: string;
          memory?: string;
          'nvidia.com/gpu'?: number;
        };
        requests?: {
          cpu?: string;
          memory?: string;
        };
      };
    };
    podSpecOverrides?: Array<{
      targetReplicatedJobs?: string[];
      [key: string]: unknown;
    }>;
  };
  status?: {
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
  };
};

export type ClusterTrainingRuntimeKind = K8sResourceCommon & {
  metadata: {
    name: string;
    labels?: {
      [key: string]: string | undefined;
    };
  };
  spec: {
    mlPolicy?: {
      numNodes?: number;
      torch?: {
        numProcPerNode?: string | number;
      };
    };
    template?: {
      spec?: {
        replicatedJobs?: Array<{
          name: string;
          replicas?: number;
          [key: string]: unknown;
        }>;
      };
    };
  };
};
