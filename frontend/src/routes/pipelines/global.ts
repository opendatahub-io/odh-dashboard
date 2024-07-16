const globNamespace = ':namespace';
export const globNamespaceAll = `/${globNamespace}?/*`;

export const pipelinesRootPath = '/pipelines';
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

export const pipelineVersionRunsRoute = (
  namespace: string | undefined,
  pipelineId: string | undefined,
  pipelineVersionId: string | undefined,
): string => `${pipelineVersionsBaseRoute(namespace, pipelineId, pipelineVersionId)}/runs`;

export const pipelineVersionArchivedRunsRoute = (
  namespace: string | undefined,
  pipelineId: string | undefined,
  pipelineVersionId: string | undefined,
): string => `${pipelineVersionRunsRoute(namespace, pipelineId, pipelineVersionId)}/archived`;

export const pipelineVersionRecurringRunsRoute = (
  namespace: string | undefined,
  pipelineId: string | undefined,
  pipelineVersionId: string | undefined,
): string => `${pipelineVersionsBaseRoute(namespace, pipelineId, pipelineVersionId)}/schedules`;

export const pipelineVersionDetailsRoute = (
  namespace: string | undefined,
  pipelineId: string | undefined,
  pipelineVersionId: string | undefined,
): string => `${pipelineVersionsBaseRoute(namespace, pipelineId, pipelineVersionId)}/view`;

export const pipelineVersionCreateRunRoute = (
  namespace: string | undefined,
  pipelineId: string | undefined,
  pipelineVersionId?: string,
): string => `${pipelineVersionRunsRoute(namespace, pipelineId, pipelineVersionId)}/create`;

export const pipelineVersionCreateRecurringRunRoute = (
  namespace: string | undefined,
  pipelineId: string | undefined,
  pipelineVersionId?: string,
): string =>
  `${pipelineVersionRecurringRunsRoute(namespace, pipelineId, pipelineVersionId)}/create`;

export const pipelineVersionCloneRunRoute = (
  namespace: string | undefined,
  pipelineId: string | undefined,
  pipelineVersionId: string | undefined,
  runId: string,
): string => `${pipelineVersionRunsRoute(namespace, pipelineId, pipelineVersionId)}/clone/${runId}`;

export const pipelineVersionCloneRecurringRunRoute = (
  namespace: string | undefined,
  pipelineId: string | undefined,
  pipelineVersionId: string | undefined,
  recurringRunId: string,
): string =>
  `${pipelineVersionRecurringRunsRoute(
    namespace,
    pipelineId,
    pipelineVersionId,
  )}/clone/${recurringRunId}`;

export const pipelineVersionRunDetailsRoute = (
  namespace: string,
  pipelineId: string | undefined,
  pipelineVersionId: string | undefined,
  runId: string,
): string => `${pipelineVersionRunsRoute(namespace, pipelineId, pipelineVersionId)}/${runId}`;

export const pipelineVersionRecurringRunDetailsRoute = (
  namespace: string,
  pipelineId: string | undefined,
  pipelineVersionId: string | undefined,
  recurringRunId: string,
): string =>
  `${pipelineVersionRecurringRunsRoute(
    namespace,
    pipelineId,
    pipelineVersionId,
  )}/${recurringRunId}`;
