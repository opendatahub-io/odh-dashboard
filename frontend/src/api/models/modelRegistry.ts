import { K8sModelCommon } from '@openshift/dynamic-plugin-sdk-utils';

export const ModelRegistryModel: K8sModelCommon = {
  apiVersion: 'v1alpha1',
  apiGroup: 'modelregistry.opendatahub.io',
  kind: 'ModelRegistry',
  plural: 'modelregistries',
};
