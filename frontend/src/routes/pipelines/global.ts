import { PipelineRunType } from '~/pages/pipelines/global/runs';

const globNamespace = ':namespace';
export const globNamespaceAll = `/${globNamespace}?/*`;

const globPipelineId = ':pipelineId';
const globPipelineVersionId = ':pipelineVersionId';
const globPipelineRunId = ':runId';
const globPipelineRecurringRunId = ':recurringRunId';

// pipelines and versions
const globPipeline = 'pipeline';
const globPipelines = `${globPipeline}s`;
export const routePipelineDetails = (pipelineId: string, versionId: string): string =>
  `${globPipeline}/view/${pipelineId}/${versionId}`;
export const routePipelineVersionRuns = (pipelineId: string, versionId: string): string =>
  `${globPipeline}/runs/${pipelineId}/${versionId}`;
export const routePipelines = (): string => `/${globPipelines}`;
export const globPipelinesAll = `${routePipelines()}/*`;
export const globPipelineDetails = routePipelineDetails(globPipelineId, globPipelineVersionId);
export const globPipelineVersionRuns = routePipelineVersionRuns(
  globPipelineId,
  globPipelineVersionId,
);
export const routePipelinesNamespace = (namespace?: string): string =>
  namespace ? `/${globPipelines}/${namespace}` : routePipelines();
export const routePipelineDetailsNamespace = (
  namespace: string,
  pipelineId: string,
  versionId: string,
): string => `${routePipelinesNamespace(namespace)}/${routePipelineDetails(pipelineId, versionId)}`;
export const routePipelineVersionRunsNamespace = (
  namespace: string,
  pipelineId: string,
  versionId: string,
  runType?: PipelineRunType,
): string =>
  `${routePipelinesNamespace(namespace)}/${routePipelineVersionRuns(pipelineId, versionId)}${
    runType ? `?runType=${runType}` : ''
  }`;
export const routePipelineRunCreateNamespacePipelinesPage = (namespace?: string): string =>
  `${routePipelinesNamespace(namespace)}/${globPipelineRunCreate}`;
export const routePipelineRunCloneNamespacePipelinesPage = (
  namespace: string,
  runId: string,
): string => `${routePipelinesNamespace(namespace)}/${routePipelineRunClone(runId)}`;
export const routePipelineRecurringRunCloneNamespacePipelinesPage = (
  namespace: string,
  recurringRunId: string,
): string =>
  `${routePipelinesNamespace(namespace)}/${routePipelineRecurringRunClone(recurringRunId)}`;
export const routePipelineRunDetailsNamespacePipelinesPage = (
  namespace: string,
  runId: string,
): string => `${routePipelinesNamespace(namespace)}/${routePipelineRunDetails(runId)}`;
export const routePipelineRecurringRunDetailsNamespacePipelinesPage = (
  namespace: string,
  recurringRunId: string,
): string =>
  `${routePipelinesNamespace(namespace)}/${routePipelineRecurringRunDetails(recurringRunId)}`;

// pipeline runs
const globPipelineRun = 'pipelineRun';
const globPipelineRuns = `${globPipelineRun}s`;
export const routePipelineRuns = (): string => `/${globPipelineRuns}`;
export const globPipelineRunsAll = `${routePipelineRuns()}/*`;
export const routePipelineRunDetails = (runId: string): string =>
  `${globPipelineRun}/view/${runId}`;
export const routePipelineRunsNamespace = (namespace?: string): string =>
  namespace ? `${routePipelineRuns()}/${namespace}` : routePipelineRuns();
export const globPipelineRunDetails = routePipelineRunDetails(globPipelineRunId);
export const routePipelineRunDetailsNamespace = (namespace: string, runId: string): string =>
  `${routePipelineRunsNamespace(namespace)}/${routePipelineRunDetails(runId)}`;
export const globPipelineRunCreate = `${globPipelineRun}/create`;
export const routePipelineRunCreateNamespace = (namespace?: string): string =>
  namespace
    ? `${routePipelineRunsNamespace(namespace)}/${globPipelineRunCreate}`
    : routePipelineRunsNamespace(namespace);
const routePipelineRunClone = (runId: string): string => `${globPipelineRun}/clone/${runId}`;
export const globPipelineRunClone = routePipelineRunClone(globPipelineRunId);
export const routePipelineRunCloneNamespace = (namespace: string, runId: string): string =>
  `${routePipelineRunsNamespace(namespace)}/${routePipelineRunClone(runId)}`;

// pipeline recurring runs
const globPipelineRecurringRun = 'pipelineRecurringRun';
export const routePipelineRecurringRunDetails = (recurringRunId: string): string =>
  `${globPipelineRecurringRun}/view/${recurringRunId}`;
export const globPipelineRecurringRunDetails = routePipelineRecurringRunDetails(
  globPipelineRecurringRunId,
);
export const routePipelineRecurringRunDetailsNamespace = (
  namespace: string,
  recurringRunId: string,
): string =>
  `${routePipelineRunsNamespace(namespace)}/${routePipelineRecurringRunDetails(recurringRunId)}`;
const routePipelineRecurringRunClone = (recurringRunId: string): string =>
  `${globPipelineRun}/cloneRecurringRun/${recurringRunId}`;
export const globPipelineRecurringRunClone = routePipelineRecurringRunClone(
  globPipelineRecurringRunId,
);
export const routePipelineRecurringRunCloneNamespace = (
  namespace: string,
  recurringRunId: string,
): string =>
  `${routePipelineRunsNamespace(namespace)}/${routePipelineRecurringRunClone(recurringRunId)}`;
