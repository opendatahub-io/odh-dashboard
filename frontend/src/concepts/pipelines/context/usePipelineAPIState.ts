import React from 'react';
import {
  createExperiment,
  createPipelineRun,
  createPipelineRunJob,
  deletePipeline,
  deletePipelineRun,
  deletePipelineRunJob,
  deletePipelineVersion,
  getExperiment,
  getPipeline,
  getPipelineRun,
  getPipelineRunJob,
  getPipelineVersion,
  listExperiments,
  listPipelineRunJobs,
  listPipelineRuns,
  listPipelineActiveRuns,
  listPipelineArchivedRuns,
  listPipelines,
  listPipelineVersions,
  stopPipelineRun,
  updatePipelineRunJob,
  uploadPipeline,
  uploadPipelineVersion,
  archivePipelineRun,
  unarchivePipelineRun,
  createPipelineAndVersion,
  createPipelineVersion,
  archiveExperiment,
  unarchiveExperiment,
  deleteExperiment,
  retryPipelineRun,
} from '~/api';
import { PipelineAPIs } from '~/concepts/pipelines/types';
import { APIState } from '~/concepts/proxy/types';
import useAPIState from '~/concepts/proxy/useAPIState';

export type PipelineAPIState = APIState<PipelineAPIs>;

const usePipelineAPIState = (
  hostPath: string | null,
): [apiState: PipelineAPIState, refreshAPIState: () => void] => {
  const createAPI = React.useCallback(
    (path: string) => ({
      createPipelineVersion: createPipelineVersion(path),
      createPipelineAndVersion: createPipelineAndVersion(path),
      createExperiment: createExperiment(path),
      createPipelineRun: createPipelineRun(path),
      createPipelineRunJob: createPipelineRunJob(path),
      getExperiment: getExperiment(path),
      getPipeline: getPipeline(path),
      getPipelineRun: getPipelineRun(path),
      getPipelineRunJob: getPipelineRunJob(path),
      getPipelineVersion: getPipelineVersion(path),
      deletePipeline: deletePipeline(path),
      deletePipelineRun: deletePipelineRun(path),
      deletePipelineRunJob: deletePipelineRunJob(path),
      deletePipelineVersion: deletePipelineVersion(path),
      deleteExperiment: deleteExperiment(path),
      listExperiments: listExperiments(path),
      listPipelines: listPipelines(path),
      listPipelineRuns: listPipelineRuns(path),
      listPipelineActiveRuns: listPipelineActiveRuns(path),
      listPipelineArchivedRuns: listPipelineArchivedRuns(path),
      listPipelineRunJobs: listPipelineRunJobs(path),
      listPipelineVersions: listPipelineVersions(path),
      archivePipelineRun: archivePipelineRun(path),
      unarchivePipelineRun: unarchivePipelineRun(path),
      retryPipelineRun: retryPipelineRun(path),
      archiveExperiment: archiveExperiment(path),
      unarchiveExperiment: unarchiveExperiment(path),
      stopPipelineRun: stopPipelineRun(path),
      updatePipelineRunJob: updatePipelineRunJob(path),
      uploadPipeline: uploadPipeline(path),
      uploadPipelineVersion: uploadPipelineVersion(path),
    }),
    [],
  );

  return useAPIState(hostPath, createAPI);
};

export default usePipelineAPIState;
