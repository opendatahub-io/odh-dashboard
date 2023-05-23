import React from 'react';
import {
  createExperiment,
  createPipelineRun,
  createPipelineRunJob,
  deletePipeline,
  deletePipelineRun,
  deletePipelineRunJob,
  getExperiment,
  getPipeline,
  getPipelineRun,
  getPipelineRunJob,
  listExperiments,
  listPipelineRunJobs,
  listPipelineRuns,
  listPipelineRunsByPipeline,
  listPipelines,
  listPipelineTemplates,
  stopPipelineRun,
  updatePipelineRunJob,
  uploadPipeline,
} from '~/api';
import { PipelineAPIs } from '~/concepts/pipelines/types';
import { APIState } from '~/concepts/proxy/types';
import useAPIState from '~/concepts/proxy/useAPIState';

export type PipelineAPIState = APIState<PipelineAPIs>;

const usePipelineAPIState = (
  hostPath: string | null,
): [apiState: PipelineAPIState, refreshAPIState: () => void] => {
  const createAPI = React.useCallback(
    (path) => ({
      createExperiment: createExperiment(path),
      createPipelineRun: createPipelineRun(path),
      createPipelineRunJob: createPipelineRunJob(path),
      getExperiment: getExperiment(path),
      getPipeline: getPipeline(path),
      getPipelineRun: getPipelineRun(path),
      getPipelineRunJob: getPipelineRunJob(path),
      deletePipeline: deletePipeline(path),
      deletePipelineRun: deletePipelineRun(path),
      deletePipelineRunJob: deletePipelineRunJob(path),
      listExperiments: listExperiments(path),
      listPipelines: listPipelines(path),
      listPipelineRuns: listPipelineRuns(path),
      listPipelineRunJobs: listPipelineRunJobs(path),
      listPipelineRunsByPipeline: listPipelineRunsByPipeline(path),
      listPipelineTemplate: listPipelineTemplates(path),
      stopPipelineRun: stopPipelineRun(path),
      updatePipelineRunJob: updatePipelineRunJob(path),
      uploadPipeline: uploadPipeline(path),
    }),
    [],
  );

  return useAPIState(hostPath, createAPI);
};

export default usePipelineAPIState;
