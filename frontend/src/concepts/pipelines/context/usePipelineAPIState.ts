import React from 'react';
import {
  createExperiment,
  createPipelineRun,
  createPipelineRecurringRun,
  deletePipeline,
  deletePipelineRun,
  deletePipelineRecurringRun,
  deletePipelineVersion,
  getExperiment,
  getPipeline,
  getPipelineRun,
  getPipelineRecurringRun,
  getPipelineVersion,
  listExperiments,
  listActiveExperiments,
  listPipelineRecurringRuns,
  listPipelineRuns,
  listPipelineActiveRuns,
  listPipelineArchivedRuns,
  listPipelines,
  listPipelineVersions,
  stopPipelineRun,
  updatePipelineRecurringRun,
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
  getArtifact,
  listArtifacts,
  getPipelineByName,
} from '#~/api';
import { PipelineAPIs } from '#~/concepts/pipelines/types';
import { APIState } from '#~/concepts/proxy/types';
import useAPIState from '#~/concepts/proxy/useAPIState';

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
      createPipelineRecurringRun: createPipelineRecurringRun(path),
      getExperiment: getExperiment(path),
      getPipeline: getPipeline(path),
      getPipelineRun: getPipelineRun(path),
      getPipelineRecurringRun: getPipelineRecurringRun(path),
      getPipelineVersion: getPipelineVersion(path),
      deletePipeline: deletePipeline(path),
      deletePipelineRun: deletePipelineRun(path),
      deletePipelineRecurringRun: deletePipelineRecurringRun(path),
      deletePipelineVersion: deletePipelineVersion(path),
      deleteExperiment: deleteExperiment(path),
      listExperiments: listExperiments(path),
      listActiveExperiments: listActiveExperiments(path),
      listPipelines: listPipelines(path),
      getPipelineByName: getPipelineByName(path),
      listPipelineRuns: listPipelineRuns(path),
      listPipelineActiveRuns: listPipelineActiveRuns(path),
      listPipelineArchivedRuns: listPipelineArchivedRuns(path),
      listPipelineRecurringRuns: listPipelineRecurringRuns(path),
      listPipelineVersions: listPipelineVersions(path),
      archivePipelineRun: archivePipelineRun(path),
      unarchivePipelineRun: unarchivePipelineRun(path),
      retryPipelineRun: retryPipelineRun(path),
      archiveExperiment: archiveExperiment(path),
      unarchiveExperiment: unarchiveExperiment(path),
      stopPipelineRun: stopPipelineRun(path),
      getArtifact: getArtifact(path),
      listArtifacts: listArtifacts(path),
      updatePipelineRecurringRun: updatePipelineRecurringRun(path),
      uploadPipeline: uploadPipeline(path),
      uploadPipelineVersion: uploadPipelineVersion(path),
    }),
    [],
  );

  return useAPIState(hostPath, createAPI);
};

export default usePipelineAPIState;
