import { proxyCREATE, proxyDELETE, proxyENDPOINT, proxyFILE, proxyGET } from '~/api/proxyUtils';
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
  GetPipelineRunAPI,
  StopPipelineRunAPI,
  ListExperimentsAPI,
  CreateExperimentAPI,
  GetExperimentAPI,
  CreatePipelineRunAPI,
  CreatePipelineRunJobAPI,
  GetPipelineRunJobAPI,
  DeletePipelineRunAPI,
  DeletePipelineRunJobAPI,
} from './callTypes';
import { handlePipelineFailures } from './errorUtils';

export const createExperiment: CreateExperimentAPI = (hostPath) => (opts, name, description) =>
  handlePipelineFailures(
    proxyCREATE(hostPath, `/apis/v1beta1/experiments`, { name, description }, {}, opts),
  );

export const createPipelineRun: CreatePipelineRunAPI = (hostPath) => (opts, data) =>
  handlePipelineFailures(proxyCREATE(hostPath, `/apis/v1beta1/runs`, data, {}, opts));

export const createPipelineRunJob: CreatePipelineRunJobAPI = (hostPath) => (opts, data) =>
  handlePipelineFailures(proxyCREATE(hostPath, `/apis/v1beta1/jobs`, data, {}, opts));

export const getExperiment: GetExperimentAPI = (hostPath) => (opts, experimentId) =>
  handlePipelineFailures(proxyGET(hostPath, `/apis/v1beta1/experiments/${experimentId}`, {}, opts));

export const getPipeline: GetPipelineAPI = (hostPath) => (opts, pipelineId) =>
  handlePipelineFailures(proxyGET(hostPath, `/apis/v1beta1/pipelines/${pipelineId}`, {}, opts));

export const getPipelineRun: GetPipelineRunAPI = (hostPath) => (opts, pipelineRunId) =>
  handlePipelineFailures(proxyGET(hostPath, `/apis/v1beta1/runs/${pipelineRunId}`, {}, opts));

export const getPipelineRunJob: GetPipelineRunJobAPI = (hostPath) => (opts, pipelineRunJobId) =>
  handlePipelineFailures(proxyGET(hostPath, `/apis/v1beta1/jobs/${pipelineRunJobId}`, {}, opts));

export const deletePipeline: DeletePipelineAPI = (hostPath) => (opts, pipelineId) =>
  handlePipelineFailures(proxyDELETE(hostPath, `/apis/v1beta1/pipelines/${pipelineId}`, {}, opts));

export const deletePipelineRun: DeletePipelineRunAPI = (hostPath) => (opts, runId) =>
  handlePipelineFailures(proxyDELETE(hostPath, `/apis/v1beta1/runs/${runId}`, {}, opts));

export const deletePipelineRunJob: DeletePipelineRunJobAPI = (hostPath) => (opts, jobId) =>
  handlePipelineFailures(proxyDELETE(hostPath, `/apis/v1beta1/jobs/${jobId}`, {}, opts));

export const listExperiments: ListExperimentsAPI = (hostPath) => (opts) =>
  handlePipelineFailures(
    // eslint-disable-next-line camelcase
    proxyGET(hostPath, '/apis/v1beta1/experiments', {}, opts),
  );

export const listPipelines: ListPipelinesAPI = (hostPath) => (opts, count) =>
  handlePipelineFailures(
    // eslint-disable-next-line camelcase
    proxyGET(
      hostPath,
      '/apis/v1beta1/pipelines',
      // eslint-disable-next-line camelcase
      { page_size: count, sort_by: 'created_at desc' },
      opts,
    ),
  );

export const listPipelineRuns: ListPipelinesRunAPI = (hostPath) => (opts) =>
  handlePipelineFailures(
    // eslint-disable-next-line camelcase
    proxyGET(hostPath, '/apis/v1beta1/runs', { sort_by: 'created_at desc' }, opts),
  );

export const listPipelineRunJobs: ListPipelinesRunJobAPI = (hostPath) => (opts) =>
  handlePipelineFailures(proxyGET(hostPath, '/apis/v1beta1/jobs', {}, opts));

export const listPipelineRunsByPipeline: ListPipelineRunsByPipelineAPI =
  (hostPath) => (opts, pipelineId, count) =>
    handlePipelineFailures(
      proxyGET(
        hostPath,
        '/apis/v1beta1/runs',
        {
          'resource_reference_key.id': pipelineId,
          'resource_reference_key.type': ResourceTypeKF.PIPELINE_VERSION,
          // eslint-disable-next-line camelcase
          page_size: count,
          // eslint-disable-next-line camelcase
          sort_by: 'created_at desc',
        },
        opts,
      ),
    );

export const listPipelineTemplates: ListPipelineTemplatesAPI = (hostPath) => (opts, pipelineId) =>
  handlePipelineFailures(
    proxyGET(hostPath, `/apis/v1beta1/pipelines/${pipelineId}/templates`, {}, opts),
  );

export const stopPipelineRun: StopPipelineRunAPI = (hostPath) => (opts, runId) =>
  handlePipelineFailures(
    proxyENDPOINT(hostPath, `/apis/v1beta1/runs/${runId}/terminate`, {}, opts),
  );

export const updatePipelineRunJob: UpdatePipelineRunJobAPI = (hostPath) => (opts, jobId, enabled) =>
  handlePipelineFailures(
    proxyENDPOINT(
      hostPath,
      `/apis/v1beta1/jobs/${jobId}/${enabled ? 'enable' : 'disable'}`,
      {},
      opts,
    ),
  );

export const uploadPipeline: UploadPipelineAPI =
  (hostPath) => (opts, name, description, fileContents) =>
    handlePipelineFailures(
      proxyFILE(hostPath, '/apis/v1beta1/pipelines/upload', fileContents, { name, description }),
    );
