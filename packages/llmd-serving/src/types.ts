import type { K8sModelCommon, K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import type { DisplayNameAnnotations, MetadataAnnotation } from '@odh-dashboard/internal/k8sTypes';
import type { Deployment } from '@odh-dashboard/model-serving/extension-points';
import type { PodContainer } from '@odh-dashboard/internal/types.js';

export type LLMInferenceServiceKind = K8sResourceCommon & {
  kind: 'LLMInferenceService';
  metadata: {
    name: string;
    namespace: string;
    annotations?: DisplayNameAnnotations & {
      [MetadataAnnotation.ConnectionName]?: string;
    } & {
      'opendatahub.io/model-type'?: string; // ['predictive' | 'generative']
    };
  };
  spec: {
    model: {
      uri: string;
      name?: string;
    };
    replicas?: number;
    router?: {
      gateway?: object;
      route?: object;
      scheduler?: object;
    };
    template?: {
      containers?: PodContainer[];
    };
  };
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

export type LLMdDeployment = Deployment<LLMInferenceServiceKind>;

export const LLMInferenceServiceModel: K8sModelCommon = {
  apiVersion: 'v1alpha1',
  apiGroup: 'serving.kserve.io',
  kind: 'LLMInferenceService',
  plural: 'llminferenceservices',
};
