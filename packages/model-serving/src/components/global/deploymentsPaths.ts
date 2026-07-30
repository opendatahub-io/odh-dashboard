export const DEPLOYMENTS_BASE_PATH = '/ai-hub/models/deployments';
export const DEPLOYMENTS_INTERNAL_SEGMENT = 'internal';
export const DEPLOYMENTS_EXTERNAL_SEGMENT = 'external';
export const DEPLOYMENTS_LEGACY_EXTERNAL_TAB_SEGMENT = 'external-models';

const RESERVED_DEPLOYMENTS_SEGMENTS = new Set([
  DEPLOYMENTS_INTERNAL_SEGMENT,
  DEPLOYMENTS_EXTERNAL_SEGMENT,
  DEPLOYMENTS_LEGACY_EXTERNAL_TAB_SEGMENT,
]);

const EXTERNAL_DEPLOYMENTS_PATH_PATTERN = new RegExp(
  `^${DEPLOYMENTS_BASE_PATH}/(?:${DEPLOYMENTS_EXTERNAL_SEGMENT}|${DEPLOYMENTS_LEGACY_EXTERNAL_TAB_SEGMENT})(?:/|$)`,
);

export const deploymentsInternalPath = (namespace?: string): string =>
  namespace
    ? `${DEPLOYMENTS_BASE_PATH}/${DEPLOYMENTS_INTERNAL_SEGMENT}/${namespace}`
    : `${DEPLOYMENTS_BASE_PATH}/${DEPLOYMENTS_INTERNAL_SEGMENT}`;

export const deploymentsExternalPath = (namespace?: string): string =>
  namespace
    ? `${DEPLOYMENTS_BASE_PATH}/${DEPLOYMENTS_EXTERNAL_SEGMENT}/${namespace}`
    : `${DEPLOYMENTS_BASE_PATH}/${DEPLOYMENTS_EXTERNAL_SEGMENT}`;

export const deploymentsLegacyPath = (namespace?: string): string =>
  namespace ? `${DEPLOYMENTS_BASE_PATH}/${namespace}` : DEPLOYMENTS_BASE_PATH;

export const isExternalDeploymentsPath = (pathname: string): boolean =>
  EXTERNAL_DEPLOYMENTS_PATH_PATTERN.test(pathname);

export const getLegacyNamespaceFromPath = (pathname: string): string | undefined => {
  const match = pathname.match(new RegExp(`^${DEPLOYMENTS_BASE_PATH}/([^/]+)$`));
  const segment = match?.[1];
  if (!segment || RESERVED_DEPLOYMENTS_SEGMENTS.has(segment)) {
    return undefined;
  }
  return segment;
};
