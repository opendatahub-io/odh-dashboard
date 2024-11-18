import { K8sModelCommon } from '@openshift/dynamic-plugin-sdk-utils';

export const ModelRegistryModel = {
  apiVersion: 'v1alpha1',
  apiGroup: 'modelregistry.opendatahub.io',
  kind: 'ModelRegistry',
  plural: 'modelregistries',
} satisfies K8sModelCommon;
