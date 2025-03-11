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
