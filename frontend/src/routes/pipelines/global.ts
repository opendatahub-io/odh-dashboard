const globNamespace = ':namespace';
export const globNamespaceAll = `/${globNamespace}?/*`;

export const pipelinesRootPath = '/develop-train/pipelines/definitions';
export const globPipelinesAll = `${pipelinesRootPath}/*`;

// pipelines and versions

export const pipelinesBaseRoute = (namespace?: string): string =>
  !namespace ? pipelinesRootPath : `${pipelinesRootPath}/${namespace}`;

export const pipelineVersionsBaseRoute = (
  namespace: string | undefined,
  pipelineId: string | undefined,
  pipelineVersionId: string | undefined,
): string =>
  !pipelineId || !pipelineVersionId
    ? pipelinesBaseRoute(namespace)
    : `${pipelinesBaseRoute(namespace)}/${pipelineId}/${pipelineVersionId}`;

export const pipelineVersionDetailsRoute = (
  namespace: string | undefined,
  pipelineId: string | undefined,
  pipelineVersionId: string | undefined,
): string => `${pipelineVersionsBaseRoute(namespace, pipelineId, pipelineVersionId)}/view`;
