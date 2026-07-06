/**
 * Prefix for all cluster details variables.
 * Used to identify dashboards that require cluster details data.
 */
export const CLUSTER_DETAILS_VARIABLE_PREFIX = 'CLUSTER_DETAILS_';

/**
 * Known cluster details variable names for Perses dashboards.
 * These are set by ClusterDetailsVariablesProvider.
 */
export const CLUSTER_DETAILS_VARIABLES = {
  /** The API server URL */
  API_SERVER: `${CLUSTER_DETAILS_VARIABLE_PREFIX}API_SERVER`,
  /** The operator subscription channel */
  CHANNEL: `${CLUSTER_DETAILS_VARIABLE_PREFIX}CHANNEL`,
  /** The OpenShift version */
  OPENSHIFT_VERSION: `${CLUSTER_DETAILS_VARIABLE_PREFIX}OPENSHIFT_VERSION`,
  /** The infrastructure platform type (AWS, GCP, Azure, etc.) */
  INFRASTRUCTURE_PROVIDER: `${CLUSTER_DETAILS_VARIABLE_PREFIX}INFRASTRUCTURE_PROVIDER`,
} as const;

/** Set of all known cluster details variable names for efficient lookup */
const clusterDetailsVariableNamesSet = new Set<string>(Object.values(CLUSTER_DETAILS_VARIABLES));

/** Check if a variable name is a known cluster details variable */
export const isClusterDetailsVariable = (name: string): boolean =>
  clusterDetailsVariableNamesSet.has(name);
