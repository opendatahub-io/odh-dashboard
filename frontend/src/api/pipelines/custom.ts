import { pipelinesGET } from '~/api/pipelines/callUtils';
import { ResourceTypeKF } from '~/concepts/pipelines/kfTypes';
import {
  GetPipelineAPI,
  ListPipelineRunsAPI,
  ListPipelinesAPI,
  ListPipelineTemplatesAPI,
} from './callTypes';

export const getPipeline: GetPipelineAPI = (hostPath) => (opts, pipelineId) =>
  pipelinesGET(hostPath, `/apis/v1beta1/pipelines/${pipelineId}`, {}, opts);

export const listPipelines: ListPipelinesAPI = (hostPath) => (opts, count) =>
  // eslint-disable-next-line camelcase
  pipelinesGET(hostPath, '/apis/v1beta1/pipelines', { page_size: count }, opts);

export const listPipelineRuns: ListPipelineRunsAPI = (hostPath) => (opts, pipelineId) =>
  pipelinesGET(
    hostPath,
    '/apis/v1beta1/runs',
    {
      'resource_reference_key.id': pipelineId,
      'resource_reference_key.type': ResourceTypeKF.PIPELINE_VERSION,
    },
    opts,
  );

export const listPipelineTemplates: ListPipelineTemplatesAPI = (hostPath) => (opts, pipelineId) =>
  pipelinesGET(hostPath, `/apis/v1beta1/pipelines/${pipelineId}/templates`, {}, opts);
