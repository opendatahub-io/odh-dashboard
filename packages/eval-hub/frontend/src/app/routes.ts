const globNamespace = ':namespace';
export const globNamespaceAll = `/${globNamespace}?/*`;

// Path segment used for route matching in AppRoutes
export const evaluationRootSegment = 'evaluation';

// Route helpers (used for navigation, resolved relative to the app mount root)
export const evaluationsBaseRoute = (namespace?: string): string =>
  namespace ? `/${evaluationRootSegment}/${namespace}` : `/${evaluationRootSegment}`;

export const evaluationNewRoute = (namespace?: string): string =>
  `${evaluationsBaseRoute(namespace)}/new`;
