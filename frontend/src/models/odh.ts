import { K8sModelCommon } from '@openshift/dynamic-plugin-sdk-utils';

export const ODHDashboardConfigModel: K8sModelCommon = {
  apiVersion: 'v1alpha',
  apiGroup: 'opendatahub.io',
  kind: 'ODHDashboardConfig',
  plural: 'odhdashboardconfigs',
};
