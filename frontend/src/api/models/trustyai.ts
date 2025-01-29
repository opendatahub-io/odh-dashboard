import { K8sModelCommon } from '@openshift/dynamic-plugin-sdk-utils';

export const TrustyAIApplicationsModel = {
  apiVersion: 'v1alpha1',
  apiGroup: 'trustyai.opendatahub.io',
  kind: 'TrustyAIService',
  plural: 'trustyaiservices',
} satisfies K8sModelCommon;
