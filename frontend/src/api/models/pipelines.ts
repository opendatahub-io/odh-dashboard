import { K8sModelCommon } from '@openshift/dynamic-plugin-sdk-utils';

export const DSPipelineModel: K8sModelCommon = {
  apiVersion: 'v1alpha1',
  apiGroup: 'dspipelines.opendatahub.io',
  kind: 'DSPipeline',
  plural: 'dspipelines',
};
