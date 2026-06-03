const globNamespace = ':namespace';
export const globNamespaceAll = `/${globNamespace}?/*`;

// Path segment used for route matching in AppRoutes
export const evaluationRootSegment = 'evaluation';

// Route helpers (used for navigation, resolved relative to the app mount root)
export const evaluationsBaseRoute = (namespace?: string): string =>
  namespace ? `/${evaluationRootSegment}/${namespace}` : `/${evaluationRootSegment}`;

export const evaluationCreateRoute = (namespace?: string): string =>
  `${evaluationsBaseRoute(namespace)}/create`;

export const evaluationCollectionsRoute = (namespace?: string): string =>
  `${evaluationCreateRoute(namespace)}/collections`;

export const evaluationBenchmarksRoute = (namespace?: string): string =>
  `${evaluationCreateRoute(namespace)}/benchmarks`;

export const evaluationStartRoute = (namespace?: string): string =>
  `${evaluationCreateRoute(namespace)}/start`;

export const evaluationResultsRoute = (namespace?: string, jobId?: string): string =>
  `${evaluationsBaseRoute(namespace)}/results/${jobId ?? ':jobId'}`;

export const evaluationCompareRoute = (
  namespace?: string,
  experimentIds?: string[],
  runUuids?: string[],
): string => {
  const base = `${evaluationsBaseRoute(namespace)}/compare`;
  if (!experimentIds?.length || !runUuids?.length) {
    return base;
  }
  const params = new URLSearchParams({
    experimentIds: experimentIds.join(','),
    runUuids: runUuids.join(','),
  });
  return `${base}?${params.toString()}`;
};
