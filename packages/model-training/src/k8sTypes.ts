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

export interface RayContainerResources {
  limits?: {
    cpu?: string;
    memory?: string;
    'nvidia.com/gpu'?: string | number;
    [key: string]: string | number | undefined;
  };
  requests?: {
    cpu?: string;
    memory?: string;
    'nvidia.com/gpu'?: string | number;
    [key: string]: string | number | undefined;
  };
}

export interface RayWorkerGroupSpec {
  groupName: string;
  replicas?: number;
  minReplicas?: number;
  maxReplicas?: number;
  suspend?: boolean;
  numOfHosts?: number;
  rayStartParams?: Record<string, string>;
  template: {
    spec?: {
      containers?: Array<{
        name?: string;
        image?: string;
        resources?: RayContainerResources;
        [key: string]: unknown;
      }>;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  scaleStrategy?: {
    workersToDelete?: string[];
  };
  [key: string]: unknown;
}

export interface RayHeadGroupSpec {
  rayStartParams?: Record<string, string>;
  template: {
    spec?: {
      containers?: Array<{
        name?: string;
        image?: string;
        resources?: RayContainerResources;
        [key: string]: unknown;
      }>;
      [key: string]: unknown;
    };
    [key: string]: unknown;
  };
  enableIngress?: boolean;
  serviceType?: string;
  [key: string]: unknown;
}

export interface RayClusterSpec {
  rayVersion?: string;
  headGroupSpec: RayHeadGroupSpec;
  workerGroupSpecs?: RayWorkerGroupSpec[];
  enableInTreeAutoscaling?: boolean;
  suspend?: boolean;
  managedBy?: string;
  [key: string]: unknown;
}

export interface RayClusterStatusInfo {
  state?: string;
  head?: {
    podIP?: string;
    serviceIP?: string;
    podName?: string;
    serviceName?: string;
  };
  desiredWorkerReplicas?: number;
  availableWorkerReplicas?: number;
  readyWorkerReplicas?: number;
  minWorkerReplicas?: number;
  maxWorkerReplicas?: number;
  desiredCPU?: string;
  desiredMemory?: string;
  desiredGPU?: string;
  endpoints?: Record<string, string>;
  conditions?: Array<{
    type: string;
    status: string;
    lastTransitionTime?: string;
    reason?: string;
    message?: string;
  }>;
}

export type RayClusterKind = K8sResourceCommon & {
  metadata: {
    name: string;
    namespace: string;
    uid?: string;
    labels?: Record<string, string | undefined>;
  };
  spec: RayClusterSpec;
  status?: RayClusterStatusInfo;
};

export type RayJobKind = K8sResourceCommon & {
  metadata: {
    name: string;
    namespace: string;
    labels?: {
      'kueue.x-k8s.io/queue-name'?: string;
      'kueue.x-k8s.io/cluster-queue'?: string;
      [key: string]: string | undefined;
    };
    uid?: string;
    deletionTimestamp?: string;
  };
  spec: {
    entrypoint?: string;
    runtimeEnvYAML?: string;
    jobId?: string;
    suspend?: boolean;
    submissionMode?: 'K8sJobMode' | 'HTTPMode' | 'InteractiveMode' | 'SidecarMode';
    activeDeadlineSeconds?: number;
    backoffLimit?: number;
    shutdownAfterJobFinishes?: boolean;
    ttlSecondsAfterFinished?: number;
    managedBy?: string;
    clusterSelector?: Record<string, string>;
    metadata?: Record<string, string>;
    entrypointNumCpus?: number;
    entrypointNumGpus?: number;
    entrypointResources?: string;
    rayClusterSpec?: RayClusterSpec;
    submitterPodTemplate?: K8sResourceCommon;
    submitterConfig?: {
      backoffLimit?: number;
    };
  };
  status?: {
    jobStatus?: string;
    jobDeploymentStatus?: string;
    jobId?: string;
    rayClusterName?: string;
    dashboardURL?: string;
    startTime?: string;
    endTime?: string;
    message?: string;
    reason?: string;
    succeeded?: number;
    failed?: number;
    observedGeneration?: number;
    rayJobInfo?: {
      startTime?: string;
      endTime?: string;
    };
    rayClusterStatus?: RayClusterStatusInfo;
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
