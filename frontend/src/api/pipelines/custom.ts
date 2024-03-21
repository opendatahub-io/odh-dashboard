import { proxyCREATE, proxyDELETE, proxyENDPOINT, proxyFILE, proxyGET } from '~/api/proxyUtils';
import { PipelinesFilterOp, StorageStateKF } from '~/concepts/pipelines/kfTypes';
import { PipelineParams } from '~/concepts/pipelines/types';
import {
  GetPipelineAPI,
  DeletePipelineAPI,
  ListPipelinesRunAPI,
  ListPipelinesRunJobAPI,
  ListPipelinesAPI,
  UploadPipelineAPI,
  UpdatePipelineRunJobAPI,
  GetPipelineRunAPI,
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
  ListPipelineVersionsAPI,
  UpdatePipelineRunAPI,
  CreatePipelineAndVersionAPI,
  CreatePipelineVersionAPI,
  UpdateExperimentAPI,
  DeleteExperimentAPI,
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
});

export const createExperiment: CreateExperimentAPI = (hostPath) => (opts, data) =>
  handlePipelineFailures(proxyCREATE(hostPath, `/apis/v2beta1/experiments`, data, {}, opts));

export const createPipelineAndVersion: CreatePipelineAndVersionAPI = (hostPath) => (opts, data) =>
  handlePipelineFailures(proxyCREATE(hostPath, `/apis/v2beta1/pipelines/create`, data, {}, opts));

export const createPipelineVersion: CreatePipelineVersionAPI =
  (hostPath) => (opts, pipelineId, data) =>
    handlePipelineFailures(
      proxyCREATE(hostPath, `/apis/v2beta1/pipelines/${pipelineId}/versions`, data, {}, opts),
    );

export const createPipelineRun: CreatePipelineRunAPI = (hostPath) => (opts, data) =>
  handlePipelineFailures(proxyCREATE(hostPath, `/apis/v2beta1/runs`, data, {}, opts));

export const createPipelineRunJob: CreatePipelineRunJobAPI = (hostPath) => (opts, data) =>
  handlePipelineFailures(proxyCREATE(hostPath, `/apis/v2beta1/recurringruns`, data, {}, opts));

export const getExperiment: GetExperimentAPI = (hostPath) => (opts, experimentId) =>
  handlePipelineFailures(proxyGET(hostPath, `/apis/v2beta1/experiments/${experimentId}`, {}, opts));

export const getPipeline: GetPipelineAPI = (hostPath) => (opts, pipelineId) =>
  handlePipelineFailures(proxyGET(hostPath, `/apis/v2beta1/pipelines/${pipelineId}`, {}, opts));

export const getPipelineRun: GetPipelineRunAPI = (hostPath) => (opts, pipelineRunId) =>
  handlePipelineFailures(proxyGET(hostPath, `/apis/v2beta1/runs/${pipelineRunId}`, {}, opts));

export const getPipelineRunJob: GetPipelineRunJobAPI = (hostPath) => (opts, pipelineRunJobId) =>
  handlePipelineFailures(
    proxyGET(hostPath, `/apis/v2beta1/recurringruns/${pipelineRunJobId}`, {}, opts),
  );

export const getPipelineVersion: GetPipelineVersionAPI =
  (hostPath) => (opts, pipelineId, pipelineVersionId) =>
    handlePipelineFailures(
      proxyGET(
        hostPath,
        `/apis/v2beta1/pipelines/${pipelineId}/versions/${pipelineVersionId}`,
        {},
        opts,
      ),
    );

export const deletePipeline: DeletePipelineAPI = (hostPath) => (opts, pipelineId) =>
  handlePipelineFailures(
    proxyDELETE(hostPath, `/apis/v2beta1/pipelines/${pipelineId}`, {}, {}, opts),
  );

export const deletePipelineRun: DeletePipelineRunAPI = (hostPath) => (opts, runId) =>
  handlePipelineFailures(proxyDELETE(hostPath, `/apis/v2beta1/runs/${runId}`, {}, {}, opts));

export const deletePipelineRunJob: DeletePipelineRunJobAPI = (hostPath) => (opts, jobId) =>
  handlePipelineFailures(
    proxyDELETE(hostPath, `/apis/v2beta1/recurringruns/${jobId}`, {}, {}, opts),
  );

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

export const deleteExperiment: DeleteExperimentAPI = (hostPath) => (opts, experimentId) =>
  handlePipelineFailures(
    proxyDELETE(hostPath, `/apis/v2beta1/experiments/${experimentId}`, {}, {}, opts),
  );

export const listExperiments: ListExperimentsAPI = (hostPath) => (opts, params) =>
  handlePipelineFailures(
    proxyGET(hostPath, '/apis/v2beta1/experiments', pipelineParamsToQuery(params), opts),
  );

export const listPipelines: ListPipelinesAPI = (hostPath) => (opts, params) =>
  handlePipelineFailures(
    proxyGET(hostPath, '/apis/v2beta1/pipelines', pipelineParamsToQuery(params), opts),
  );

export const listPipelineRuns: ListPipelinesRunAPI = (hostPath) => (opts, params) =>
  handlePipelineFailures(
    proxyGET(
      hostPath,
      '/apis/v2beta1/runs',
      {
        ...pipelineParamsToQuery(params),
        // eslint-disable-next-line camelcase
        experiment_id: params?.experimentId,
      },
      opts,
    ),
  );

export const listPipelineActiveRuns: ListPipelinesRunAPI = (hostPath) => (opts, params) => {
  const filterPredicates = params?.filter?.predicates;

  return listPipelineRuns(hostPath)(opts, {
    ...params,
    filter: {
      predicates: [
        {
          key: 'storage_state',
          operation: PipelinesFilterOp.EQUALS,
          // eslint-disable-next-line camelcase
          string_value: StorageStateKF.AVAILABLE,
        },
        ...(filterPredicates?.length ? [...filterPredicates] : []),
      ],
    },
  });
};

export const listPipelineArchivedRuns: ListPipelinesRunAPI = (hostPath) => (opts, params) => {
  const filterPredicates = params?.filter?.predicates;

  return listPipelineRuns(hostPath)(opts, {
    ...params,
    filter: {
      predicates: [
        {
          key: 'storage_state',
          operation: PipelinesFilterOp.EQUALS,
          // eslint-disable-next-line camelcase
          string_value: StorageStateKF.ARCHIVED,
        },
        ...(filterPredicates?.length ? [...filterPredicates] : []),
      ],
    },
  });
};

export const listPipelineRunJobs: ListPipelinesRunJobAPI = (hostPath) => (opts, params) =>
  handlePipelineFailures(
    proxyGET(
      hostPath,
      '/apis/v2beta1/recurringruns',
      {
        ...pipelineParamsToQuery(params),
        // eslint-disable-next-line camelcase
        experiment_id: params?.experimentId,
      },
      opts,
    ),
  );

export const listPipelineVersions: ListPipelineVersionsAPI =
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

export const archivePipelineRun: UpdatePipelineRunAPI = (hostPath) => (opts, runId) =>
  handlePipelineFailures(proxyENDPOINT(hostPath, `/apis/v2beta1/runs/${runId}:archive`, {}, opts));

export const unarchivePipelineRun: UpdatePipelineRunAPI = (hostPath) => (opts, runId) =>
  handlePipelineFailures(
    proxyENDPOINT(hostPath, `/apis/v2beta1/runs/${runId}:unarchive`, {}, opts),
  );

export const archiveExperiment: UpdateExperimentAPI = (hostPath) => (opts, experimentId) =>
  handlePipelineFailures(
    proxyENDPOINT(hostPath, `/apis/v2beta1/experiments/${experimentId}:archive`, {}, opts),
  );

export const unarchiveExperiment: UpdateExperimentAPI = (hostPath) => (opts, experimentId) =>
  handlePipelineFailures(
    proxyENDPOINT(hostPath, `/apis/v2beta1/experiments/${experimentId}:unarchive`, {}, opts),
  );

export const stopPipelineRun: UpdatePipelineRunAPI = (hostPath) => (opts, runId) =>
  handlePipelineFailures(
    proxyENDPOINT(hostPath, `/apis/v2beta1/runs/${runId}:terminate`, {}, opts),
  );

export const updatePipelineRunJob: UpdatePipelineRunJobAPI = (hostPath) => (opts, jobId, enabled) =>
  handlePipelineFailures(
    proxyENDPOINT(
      hostPath,
      `/apis/v2beta1/recurringruns/${jobId}:${enabled ? 'enable' : 'disable'}`,
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
