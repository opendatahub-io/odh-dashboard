import * as React from 'react';
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

export type APIState = {
  /** If API will successfully call */
  apiAvailable: boolean;
  /** The available API functions */
  api: PipelineAPIs;
};

const useAPIState = (
  hostPath: string | null,
): [apiState: APIState, refreshAPIState: () => void] => {
  const [internalAPIToggleState, setInternalAPIToggleState] = React.useState(false);

  const refreshAPIState = React.useCallback(() => {
    setInternalAPIToggleState((v) => !v);
  }, []);

  const apiState = React.useMemo<APIState>(() => {
    // Note: This is a hack usage to get around the linter -- avoid copying this logic
    // eslint-disable-next-line no-console
    console.log('Computing Pipeline API', internalAPIToggleState ? '' : '');

    let path = hostPath;
    if (!path) {
      // TODO: we need to figure out maybe a stopgap or something
      path = '';
    }

    return {
      apiAvailable: !!path,
      api: {
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
      },
    };
  }, [hostPath, internalAPIToggleState]);

  return [apiState, refreshAPIState];
};

export default useAPIState;
