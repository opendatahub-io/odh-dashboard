import type {
  K8sCondition,
  K8sResourceCommon,
  InferenceServiceKind,
} from '@odh-dashboard/internal/k8sTypes';
import type { K8sModelCommon } from '@openshift/dynamic-plugin-sdk-utils';
import type { Deployment } from '@odh-dashboard/model-serving/extension-points';
import { NIM_ID } from '../extensions';

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
    image: {
      repository: string;
      tag?: string;
      pullPolicy?: string;
      pullSecrets?: string[];
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
        port?: number;
        openaiPort?: number;
      };
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
  };
  status?: {
    state?: string;
    conditions?: K8sCondition[];
    availableReplicas?: number;
  };
};

export type NIMDeployment = Deployment<NIMServiceKind, InferenceServiceKind>;

export const isNIMDeployment = (deployment: Deployment): deployment is NIMDeployment =>
  deployment.modelServingPlatformId === NIM_ID;

/**
 * Check if an InferenceService is owned by a NIMService
 * by inspecting its ownerReferences.
 */
export const isNIMOwned = (inferenceService: InferenceServiceKind): boolean =>
  inferenceService.metadata.ownerReferences?.some(
    (ref) => ref.kind === 'NIMService' && ref.apiVersion.startsWith('apps.nvidia.com/'),
  ) ?? false;
