import { proxyDELETE, proxyFILE, proxyGET } from '~/api/proxyUtils';
import { ResourceTypeKF } from '~/concepts/pipelines/kfTypes';
import {
  GetPipelineAPI,
  DeletePipelineAPI,
  ListPipelineRunsAPI,
  ListPipelinesAPI,
  ListPipelineTemplatesAPI,
  UploadPipelineAPI,
} from './callTypes';
import { handlePipelineFailures } from './errorUtils';

export const getPipeline: GetPipelineAPI = (hostPath) => (opts, pipelineId) =>
  handlePipelineFailures(proxyGET(hostPath, `/apis/v1beta1/pipelines/${pipelineId}`, {}, opts));

export const deletePipeline: DeletePipelineAPI = (hostPath) => (opts, pipelineId) =>
  proxyDELETE(hostPath, `/apis/v1beta1/pipelines/${pipelineId}`, {}, opts);

export const listPipelines: ListPipelinesAPI = (hostPath) => (opts, count) =>
  handlePipelineFailures(
    // eslint-disable-next-line camelcase
    proxyGET(hostPath, '/apis/v1beta1/pipelines', { page_size: count }, opts),
  );

export const listPipelineRuns: ListPipelineRunsAPI = (hostPath) => (opts, pipelineId) =>
  handlePipelineFailures(
    proxyGET(
      hostPath,
      '/apis/v1beta1/runs',
      {
        'resource_reference_key.id': pipelineId,
        'resource_reference_key.type': ResourceTypeKF.PIPELINE_VERSION,
      },
      opts,
    ),
  );

export const listPipelineTemplates: ListPipelineTemplatesAPI = (hostPath) => (opts, pipelineId) =>
  handlePipelineFailures(
    proxyGET(hostPath, `/apis/v1beta1/pipelines/${pipelineId}/templates`, {}, opts),
  );

export const uploadPipeline: UploadPipelineAPI =
  (hostPath) => (opts, name, description, fileContents) =>
    handlePipelineFailures(
      proxyFILE(hostPath, '/apis/v1beta1/pipelines/upload', fileContents, { name, description }),
    );
