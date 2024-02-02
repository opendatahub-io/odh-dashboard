import { proxyCREATE, proxyDELETE, proxyENDPOINT, proxyFILE, proxyGET } from '~/api/proxyUtils';
import { ResourceTypeKF } from '~/concepts/pipelines/kfTypes';
import { PipelineParams } from '~/concepts/pipelines/types';
import {
  GetPipelineAPI,
  DeletePipelineAPI,
  ListPipelineRunsByPipelineAPI,
  ListPipelinesRunAPI,
  ListPipelinesRunJobAPI,
  ListPipelinesAPI,
  ListPipelineVersionTemplatesAPI,
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
  UploadPipelineVersionAPI,
  DeletePipelineVersionAPI,
  GetPipelineVersionAPI,
  ListPipelineVersionsByPipelineAPI,
} from './callTypes';
import { handlePipelineFailures } from './errorUtils';

const commonPipelineQueryParams = (params?: PipelineParams) => ({
  // eslint-disable-next-line camelcase
  sort_by: params?.sortField
    ? `${params.sortField} ${params.sortDirection || 'asc'}`
    : 'created_at desc',
  // eslint-disable-next-line camelcase
  page_size: params?.pageSize,
  // eslint-disable-next-line camelcase
  page_token: params?.pageToken,
  filter: params?.filter?.predicates
    ? JSON.stringify({ predicates: params.filter.predicates })
    : undefined,
});

const pipelineParamsToQuery = (params?: PipelineParams) => ({
  ...commonPipelineQueryParams(params),
  'resource_reference_key.type': params?.filter?.resourceReference?.type,
  'resource_reference_key.id': params?.filter?.resourceReference?.id,
});

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

export const getPipelineVersion: GetPipelineVersionAPI = (hostPath) => (opts, pipelineVersionId) =>
  handlePipelineFailures(
    proxyGET(hostPath, `/apis/v1beta1/pipeline_versions/${pipelineVersionId}`, {}, opts),
  );

export const deletePipeline: DeletePipelineAPI = (hostPath) => (opts, pipelineId) =>
  handlePipelineFailures(
    proxyDELETE(hostPath, `/apis/v2beta1/pipelines/${pipelineId}`, {}, {}, opts),
  );

export const deletePipelineRun: DeletePipelineRunAPI = (hostPath) => (opts, runId) =>
  handlePipelineFailures(proxyDELETE(hostPath, `/apis/v1beta1/runs/${runId}`, {}, {}, opts));

export const deletePipelineRunJob: DeletePipelineRunJobAPI = (hostPath) => (opts, jobId) =>
  handlePipelineFailures(proxyDELETE(hostPath, `/apis/v1beta1/jobs/${jobId}`, {}, {}, opts));

export const deletePipelineVersion: DeletePipelineVersionAPI =
  (hostPath) => (opts, pipelineId, pipelineVersionId) =>
    handlePipelineFailures(
      proxyDELETE(
        hostPath,
        `/apis/v2beta1/pipelines/${pipelineId}/versions/${pipelineVersionId}`,
        {},
        {},
        opts,
      ),
    );

export const listExperiments: ListExperimentsAPI = (hostPath) => (opts, params) =>
  handlePipelineFailures(
    proxyGET(hostPath, '/apis/v1beta1/experiments', pipelineParamsToQuery(params), opts),
  );

export const listPipelines: ListPipelinesAPI = (hostPath) => (opts, params) =>
  handlePipelineFailures(
    proxyGET(hostPath, '/apis/v2beta1/pipelines', pipelineParamsToQuery(params), opts),
  );

export const listPipelineRuns: ListPipelinesRunAPI = (hostPath) => (opts, params) =>
  handlePipelineFailures(
    proxyGET(hostPath, '/apis/v1beta1/runs', pipelineParamsToQuery(params), opts),
  );

export const listPipelineRunJobs: ListPipelinesRunJobAPI = (hostPath) => (opts, params) =>
  handlePipelineFailures(
    proxyGET(hostPath, '/apis/v1beta1/jobs', pipelineParamsToQuery(params), opts),
  );

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

export const listPipelineVersionTemplates: ListPipelineVersionTemplatesAPI =
  (hostPath) => (opts, pipelineVersionId) =>
    handlePipelineFailures(
      proxyGET(
        hostPath,
        `/apis/v1beta1/pipeline_versions/${pipelineVersionId}/templates`,
        {},
        opts,
      ),
    );

export const listPipelineVersionsByPipeline: ListPipelineVersionsByPipelineAPI =
  (hostPath) => (opts, pipelineId, params) =>
    handlePipelineFailures(
      proxyGET(
        hostPath,
        `/apis/v2beta1/pipelines/${pipelineId}/versions`,
        {
          ...commonPipelineQueryParams(params),
          // eslint-disable-next-line camelcase
          pipeline_id: pipelineId,
        },
        opts,
      ),
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
      proxyFILE(hostPath, '/apis/v2beta1/pipelines/upload', fileContents, { name, description }),
    );

export const uploadPipelineVersion: UploadPipelineVersionAPI =
  (hostPath) => (opts, name, description, fileContents, pipelineId) =>
    handlePipelineFailures(
      proxyFILE(hostPath, '/apis/v2beta1/pipelines/upload_version', fileContents, {
        name,
        description,
        pipelineid: pipelineId,
      }),
    );
