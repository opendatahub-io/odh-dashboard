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
