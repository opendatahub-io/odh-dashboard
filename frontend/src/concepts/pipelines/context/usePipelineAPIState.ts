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
  listPipelineRunsByPipeline,
  listPipelines,
  listPipelineVersionTemplates,
  listPipelineVersions,
  stopPipelineRun,
  updatePipelineRunJob,
  uploadPipeline,
  uploadPipelineVersion,
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
      listExperiments: listExperiments(path),
      listPipelines: listPipelines(path),
      listPipelineRuns: listPipelineRuns(path),
      listPipelineRunJobs: listPipelineRunJobs(path),
      listPipelineRunsByPipeline: listPipelineRunsByPipeline(path),
      listPipelineVersionTemplates: listPipelineVersionTemplates(path),
      listPipelineVersions: listPipelineVersions(path),
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
