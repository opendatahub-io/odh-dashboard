import type {
  K8sCondition,
  K8sResourceCommon,
  InferenceServiceKind,
} from '@odh-dashboard/internal/k8sTypes';
import type { K8sModelCommon } from '@openshift/dynamic-plugin-sdk-utils';
import type { Deployment } from '@odh-dashboard/model-serving/extension-points';

export const NIMServiceModel: K8sModelCommon = {
  apiVersion: 'v1alpha1',
  apiGroup: 'apps.nvidia.com',
  kind: 'NIMService',
  plural: 'nimservices',
};

export type NIMServiceKind = K8sResourceCommon & {
  metadata: {
    name: string;
    namespace: string;
    annotations?: {
      'openshift.io/display-name'?: string;
      'openshift.io/description'?: string;
      [key: string]: string | undefined;
    };
  };
  spec: {
    inferencePlatform?: string;
    image: {
      repository: string;
      tag?: string;
      pullPolicy?: string;
      pullSecrets?: string[];
    };
    model?: {
      engine?: string;
      quantization?: string;
      profiles?: string[];
      lora?: {
        enabled?: boolean;
        models?: Array<{
          name?: string;
          source?: string;
        }>;
      };
    };
    authSecret?: string;
    replicas?: number;
    resources?: {
      limits?: Record<string, string>;
      requests?: Record<string, string>;
    };
    storage?: {
      pvc?: {
        name?: string;
        create?: boolean;
        size?: string;
        storageClassName?: string;
        subPath?: string;
        volumeAccessMode?: string;
        annotations?: Record<string, string>;
      };
      nimCache?: {
        name?: string;
      };
    };
    env?: Array<{
      name: string;
      value?: string;
      valueFrom?: Record<string, unknown>;
    }>;
    expose?: {
      service?: {
        type?: string;
        port?: number;
        openaiPort?: number;
      };
    };
    scale?: {
      enabled?: boolean;
      minReplicas?: number;
      maxReplicas?: number;
      metrics?: Array<{
        type?: string;
        resource?: {
          name?: string;
          target?: {
            type?: string;
            averageUtilization?: number;
            averageValue?: string;
          };
        };
      }>;
    };
    metrics?: {
      enabled?: boolean;
      port?: number;
    };
    livenessProbe?: {
      enabled?: boolean;
      probe?: Record<string, unknown>;
    };
    readinessProbe?: {
      enabled?: boolean;
      probe?: Record<string, unknown>;
    };
    startupProbe?: {
      enabled?: boolean;
      probe?: Record<string, unknown>;
    };
    annotations?: Record<string, string>;
    labels?: Record<string, string>;
    tolerations?: Array<{
      key?: string;
      operator?: string;
      value?: string;
      effect?: string;
    }>;
    nodeSelector?: Record<string, string>;
    userID?: number;
    groupID?: number;
  };
  status?: {
    state?: string;
    conditions?: K8sCondition[];
    availableReplicas?: number;
  };
};

export type NIMDeployment = Deployment<NIMServiceKind, InferenceServiceKind>;
