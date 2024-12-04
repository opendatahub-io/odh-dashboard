import { K8sModelCommon } from '@openshift/dynamic-plugin-sdk-utils';

export const DataSciencePipelineApplicationModel = {
  apiVersion: 'v1',
  apiGroup: 'datasciencepipelinesapplications.opendatahub.io',
  kind: 'DataSciencePipelinesApplication',
  plural: 'datasciencepipelinesapplications',
} satisfies K8sModelCommon;
