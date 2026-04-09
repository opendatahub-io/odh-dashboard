import type { K8sModelCommon, K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import type {
  DisplayNameAnnotations,
  ImagePullSecret,
  MetadataAnnotation,
} from '@odh-dashboard/internal/k8sTypes';
import type { Deployment } from '@odh-dashboard/model-serving/extension-points';
import type { PodContainer } from '@odh-dashboard/internal/types';
import { LLMD_SERVING_ID } from '../extensions/extensions';

export const MAAS_TIERS_ANNOTATION = 'alpha.maas.opendatahub.io/tiers';
export const MAAS_ENDPOINT_LABEL = 'opendatahub.io/maas-endpoint';

export type LLMdContainer = { name: string; args?: string[] } & Partial<PodContainer>;

// Shared by both LLMInferenceService and LLMInferenceServiceConfig
// https://kserve.github.io/website/docs/reference/crd-api#llminferenceservice
type LLMInferenceServiceSpec = {
  baseRefs?: {
    name?: string;
  }[];
  model: {
    uri: string;
    name?: string;
  };
  replicas?: number;
  router?: {
    gateway?: {
      refs?: {
        name?: string;
        namespace?: string;
      }[];
    };
    route?: object;
    scheduler?: object;
  };
  template?: {
    containers?: LLMdContainer[];
    imagePullSecrets?: ImagePullSecret[];
  };
};

export const VLLM_ADDITIONAL_ARGS = 'VLLM_ADDITIONAL_ARGS';

export type LLMInferenceServiceKind = K8sResourceCommon & {
  kind: 'LLMInferenceService';
  metadata: {
    name: string;
    namespace: string;
    annotations?: DisplayNameAnnotations & {
      [MetadataAnnotation.ConnectionName]?: string;
    } & {
      'opendatahub.io/model-type'?: 'generative';
      'opendatahub.io/genai-use-case'?: string;
      [MAAS_TIERS_ANNOTATION]?: string;
    };
    labels?: {
      'opendatahub.io/genai-asset'?: 'true' | 'false';
      [MAAS_ENDPOINT_LABEL]?: 'true';
    };
  };
  spec: LLMInferenceServiceSpec;
  status?: {
    conditions?: {
      lastTransitionTime?: string;
      message?: string;
      reason?: string;
      severity?: string;
      status?: string;
      type?: string;
    }[];
    url?: string;
    addresses?: { name?: string; url?: string }[];
    observedGeneration?: number;
  };
};
export const isLLMInferenceService = (
  resource?: K8sResourceCommon,
): resource is LLMInferenceServiceKind => resource?.kind === 'LLMInferenceService';

export type LLMInferenceServiceConfigKind = K8sResourceCommon & {
  kind: 'LLMInferenceServiceConfig';
  metadata: {
    name: string;
    namespace: string;
    annotations?: DisplayNameAnnotations & {
      'opendatahub.io/recommended-accelerators'?: string;
      'opendatahub.io/runtime-version'?: string;
      'opendatahub.io/template-name'?: string;
      'opendatahub.io/disabled'?: 'true' | 'false';
    };
    labels?: {
      'opendatahub.io/config-type'?: 'accelerator' | string;
    };
  };
  spec?: LLMInferenceServiceSpec;
};
export const isLLMInferenceServiceConfig = (
  resource?: K8sResourceCommon,
): resource is LLMInferenceServiceConfigKind => resource?.kind === 'LLMInferenceServiceConfig';

export type LLMdDeployment = Deployment<LLMInferenceServiceKind, LLMInferenceServiceConfigKind>;

export const isLLMdDeployment = (deployment: Deployment): deployment is LLMdDeployment =>
  deployment.modelServingPlatformId === LLMD_SERVING_ID;

export const LLMInferenceServiceModel: K8sModelCommon = {
  apiVersion: 'v1alpha1',
  apiGroup: 'serving.kserve.io',
  kind: 'LLMInferenceService',
  plural: 'llminferenceservices',
};

export const LLMInferenceServiceConfigModel: K8sModelCommon = {
  apiVersion: 'v1alpha1',
  apiGroup: 'serving.kserve.io',
  kind: 'LLMInferenceServiceConfig',
  plural: 'llminferenceserviceconfigs',
};

export enum LLMInferenceServiceReadyConditionReason {
  PROGRESS_DEADLINE_EXCEEDED = 'ProgressDeadlineExceeded',
  STOPPED = 'Stopped',
  MINIMUM_REPLICAS_UNAVAILABLE = 'MinimumReplicasUnavailable',
  PROGRESSING = 'Progressing',
}
