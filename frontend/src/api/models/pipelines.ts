import { K8sModelCommon } from '@openshift/dynamic-plugin-sdk-utils';

export const DataSciencePipelineApplicationModel: K8sModelCommon = {
  apiVersion: 'v1alpha1',
  apiGroup: 'datasciencepipelinesapplications.opendatahub.io',
  kind: 'DataSciencePipelinesApplication',
  plural: 'datasciencepipelinesapplications',
};
