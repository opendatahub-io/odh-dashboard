import { K8sModelCommon } from '@openshift/dynamic-plugin-sdk-utils';

export const NIMAccountModel: K8sModelCommon = {
  apiVersion: 'v1',
  apiGroup: 'nim.opendatahub.io',
  kind: 'Account',
  plural: 'accounts',
};

export const NIMServiceModel: K8sModelCommon = {
  apiVersion: 'v1alpha1',
  apiGroup: 'apps.nvidia.com',
  kind: 'NIMService',
  plural: 'nimservices',
};
