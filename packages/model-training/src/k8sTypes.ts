import { K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';

export type TrainJobKind = K8sResourceCommon & {
  metadata: {
    annotations?: Partial<{
      'opendatahub.io/display-name': string;
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
    trainer: {
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
