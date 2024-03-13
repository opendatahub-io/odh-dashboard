const globNamespace = ':namespace';
export const globNamespaceAll = `/${globNamespace}?/*`;

const globPipelineId = ':pipelineId';
const globPipelineVersionId = ':pipelineVersionId';
const globPipelineRunId = ':pipelineRunId';
const globPipelineRunJobId = ':pipelineRunJobId';

// pipelines and versions
const globPipeline = 'pipeline';
const globPipelines = `${globPipeline}s`;
export const routePipelineDetails = (pipelineId: string, versionId: string): string =>
  `${globPipeline}/view/${pipelineId}/${versionId}`;
export const routePipelines = (): string => `/${globPipelines}`;
export const globPipelinesAll = `${routePipelines()}/*`;
export const globPipelineDetails = routePipelineDetails(globPipelineId, globPipelineVersionId);
export const routePipelinesNamespace = (namespace: string): string =>
  `/${globPipelines}/${namespace}`;
export const routePipelineDetailsNamespace = (
  namespace: string,
  pipelineId: string,
  versionId: string,
): string => `${routePipelinesNamespace(namespace)}/${routePipelineDetails(pipelineId, versionId)}`;
export const routePipelineRunCreateNamespacePipelinesPage = (namespace: string): string =>
  `${routePipelinesNamespace(namespace)}/${globPipelineRunCreate}`;

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

// pipeline run jobs
const globPipelineRunJob = 'pipelineRunJob';
const routePipelineRunJobDetails = (jobId: string): string => `${globPipelineRunJob}/view/${jobId}`;
export const globPipelineRunJobDetails = routePipelineRunJobDetails(globPipelineRunJobId);
export const routePipelineRunJobDetailsNamespace = (namespace: string, jobId: string): string =>
  `${routePipelineRunsNamespace(namespace)}/${routePipelineRunJobDetails(jobId)}`;
const routePipelineRunJobClone = (jobId: string): string => `${globPipelineRun}/cloneJob/${jobId}`;
export const globPipelineRunJobClone = routePipelineRunJobClone(globPipelineRunJobId);
export const routePipelineRunJobCloneNamespace = (namespace: string, jobId: string): string =>
  `${routePipelineRunsNamespace(namespace)}/${routePipelineRunJobClone(jobId)}`;
