import { K8sModelCommon } from '@openshift/dynamic-plugin-sdk-utils';

export const ServingRuntimeModel: K8sModelCommon = {
  apiVersion: 'v1alpha1',
  apiGroup: 'serving.kserve.io',
  kind: 'ServingRuntime',
  plural: 'servingruntimes',
};

export const InferenceServiceModel: K8sModelCommon = {
  apiVersion: 'v1beta1',
  apiGroup: 'serving.kserve.io',
  kind: 'InferenceService',
  plural: 'inferenceservices',
};

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

export const MaaSModelRefResourceModel: K8sModelCommon = {
  apiVersion: 'v1alpha1',
  apiGroup: 'maas.opendatahub.io',
  kind: 'MaaSModelRef',
  plural: 'maasmodelrefs',
};
