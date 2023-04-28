import { proxyCREATE, proxyDELETE, proxyFILE, proxyGET } from '~/api/proxyUtils';
import { ResourceTypeKF } from '~/concepts/pipelines/kfTypes';
import {
  GetPipelineAPI,
  DeletePipelineAPI,
  ListPipelineRunsByPipelineAPI,
  ListPipelinesRunAPI,
  ListPipelinesRunJobAPI,
  ListPipelinesAPI,
  ListPipelineTemplatesAPI,
  UploadPipelineAPI,
  UpdatePipelineRunJobAPI,
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

export const listPipelineRuns: ListPipelinesRunAPI = (hostPath) => (opts) =>
  handlePipelineFailures(proxyGET(hostPath, '/apis/v1beta1/runs', {}, opts));

export const listPipelineRunJobs: ListPipelinesRunJobAPI = (hostPath) => (opts) =>
  handlePipelineFailures(proxyGET(hostPath, '/apis/v1beta1/jobs', {}, opts));

export const listPipelineRunsByPipeline: ListPipelineRunsByPipelineAPI =
  (hostPath) => (opts, pipelineId) =>
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

export const updatePipelineRunJob: UpdatePipelineRunJobAPI = (hostPath) => (opts, jobId, enabled) =>
  handlePipelineFailures(
    proxyCREATE(
      hostPath,
      `/apis/v1beta1/jobs/${jobId}/${enabled ? 'enable' : 'disable'}`,
      {},
      {},
      opts,
    ),
  );

export const uploadPipeline: UploadPipelineAPI =
  (hostPath) => (opts, name, description, fileContents) =>
    handlePipelineFailures(
      proxyFILE(hostPath, '/apis/v1beta1/pipelines/upload', fileContents, { name, description }),
    );
