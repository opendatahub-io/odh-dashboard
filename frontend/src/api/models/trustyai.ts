import { K8sModelCommon } from '@openshift/dynamic-plugin-sdk-utils';

export const TrustyAIApplicationsModel: K8sModelCommon = {
  apiVersion: 'v1alpha1',
  apiGroup: 'trustyai.opendatahub.io',
  kind: 'TrustyAIService',
  plural: 'trustyaiservices',
};
