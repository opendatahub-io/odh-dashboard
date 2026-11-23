import type { K8sModelCommon } from '@openshift/dynamic-plugin-sdk-utils';

export const ServingRuntimeModel: K8sModelCommon = {
  apiVersion: 'v1alpha1',
  apiGroup: 'serving.kserve.io',
  kind: 'ServingRuntime',
  plural: 'servingruntimes',
};
