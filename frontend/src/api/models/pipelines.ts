import { K8sModelCommon } from '@openshift/dynamic-plugin-sdk-utils';

export const DataSciencePipelineApplicationModel: K8sModelCommon = {
  apiVersion: 'v1alpha1',
  apiGroup: 'datasciencepipelinesapplications.opendatahub.io',
  kind: 'DataSciencePipelinesApplication',
  plural: 'datasciencepipelinesapplications',
};

export const PipelineRunModel: K8sModelCommon = {
  apiVersion: 'v1beta1',
  apiGroup: 'tekton.dev',
  kind: 'PipelineRun',
  plural: 'pipelineruns',
};

export const PipelineModel: K8sModelCommon = {
  apiVersion: 'v1beta1',
  apiGroup: 'tekton.dev',
  kind: 'Pipeline',
  plural: 'pipelines',
};
