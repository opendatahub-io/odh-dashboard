import type { K8sModelCommon, K8sResourceCommon } from '@openshift/dynamic-plugin-sdk-utils';
import type { DisplayNameAnnotations } from '@odh-dashboard/internal/k8sTypes';
import type { Deployment } from '@odh-dashboard/model-serving/extension-points';

export type LLMInferenceServiceKind = K8sResourceCommon & {
  kind: 'LLMInferenceService';
  metadata: {
    name: string;
    namespace: string;
    annotations?: DisplayNameAnnotations;
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
    address?: { name?: string; url?: string };
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
