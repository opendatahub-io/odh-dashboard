import type {
  AccessReviewResourceAttributes,
  Connection,
  ConnectionTypeConfigMapObj,
  DashboardConfigKind,
  K8sResourceCommon,
  K8sWatchResult,
  NamespaceApplicationCase,
  PersistentVolumeClaimKind,
  ProjectKind,
  SecretKind,
  TemplateKind,
} from '@odh-dashboard/k8s-core';

export type { K8sWatchResult } from '@odh-dashboard/k8s-core';

/**
 * Lightweight fetch-state tuple used in host-api service signatures.
 * Structurally compatible with ui-core's FetchState without creating a dependency.
 */
export type HostApiFetchState<T> = [
  data: T,
  loaded: boolean,
  loadError: Error | undefined,
  refresh: () => Promise<T | undefined>,
];

/**
 * Lightweight fetch-state object used in host-api service signatures.
 * Structurally compatible with ui-core's FetchStateObject without creating a dependency.
 */
export type HostApiFetchStateObject<T> = {
  data: T;
  loaded: boolean;
  error?: Error;
  refresh: () => Promise<T | undefined>;
};

export type ServingPlatformStatuses = {
  kServe: { enabled: boolean; installed: boolean };
  kServeNIM: { enabled: boolean; installed: boolean };
  platformEnabledCount: number;
  refreshNIMAvailability: () => Promise<boolean | undefined>;
};

/**
 * Core infrastructure primitives every federated module needs.
 * Stable, rarely changes. Provided via HostApiCoreContext.
 */
export type HostApiCoreServices = {
  /** The namespace where the dashboard operator is installed. */
  dashboardNamespace: string;

  /** Perform a SelfSubjectAccessReview to check whether the current user has a specific permission. */
  checkAccess: (attrs: Required<AccessReviewResourceAttributes>) => Promise<boolean>;

  /** Fire a tracking event with arbitrary properties. */
  trackEvent: (
    eventName: string,
    properties: Record<string, string | number | boolean | undefined>,
  ) => void;

  /** Fetch (or refresh) the DashboardConfig CR that controls feature flags and platform settings. */
  fetchDashboardConfig: (forceRefresh?: boolean) => Promise<DashboardConfigKind>;
};

/**
 * Stable K8s operations available to all federated modules.
 * Provided via HostApiInfraContext.
 */
export type HostApiInfraServices = {
  /** Create a new Secret resource. */
  createSecret: (data: SecretKind, opts?: { dryRun?: boolean }) => Promise<SecretKind>;
  /** Fetch a Secret by namespace and name. */
  getSecret: (namespace: string, name: string) => Promise<SecretKind>;
  /** Delete a Secret by namespace and name. */
  deleteSecret: (namespace: string, name: string) => Promise<unknown>;
  /** Fetch all secrets in a namespace that match a given label selector. */
  getSecretsByLabel: (label: string, namespace: string) => Promise<SecretKind[]>;
  /** Patch a Secret to add an owner reference, linking it to a parent resource. */
  patchSecretWithOwnerReference: (
    secret: SecretKind,
    owner: K8sResourceCommon & { metadata: { name: string } },
    uid: string,
  ) => Promise<SecretKind>;
  /** Patch a Secret to set the connection-type protocol annotation. */
  patchSecretWithProtocolAnnotation: (secret: SecretKind, protocol: string) => Promise<SecretKind>;
  /** Create a new OpenShift project and return the project name. */
  createProject: (
    username: string,
    displayName: string,
    description: string,
    k8sName?: string,
  ) => Promise<string>;
  /** Fetch all PVCs in a project that are managed by the dashboard. */
  getDashboardPvcs: (projectName: string) => Promise<PersistentVolumeClaimKind[]>;
};

/**
 * Domain-specific services bridged from the host to federated modules.
 * These shrink over time as domain logic relocates into owning packages.
 * Provided via HostApiContext (the domain bridge).
 */
export type HostApiServices = {
  /** Watch serving runtime templates in a namespace. Returns a K8s watch-style tuple. */
  useTemplates: (namespace?: string) => K8sWatchResult<TemplateKind[]>;

  /** Mark a project as supporting a specific serving platform (e.g. KServe, ModelMesh). */
  setProjectServingPlatform: (
    name: string,
    servingPlatform: NamespaceApplicationCase,
    dryRun?: boolean,
  ) => Promise<string>;

  /** Watch connection types, optionally filtered for model-serving compatibility. */
  useWatchConnectionTypes: (
    modelServingCompatible?: boolean,
  ) => HostApiFetchState<ConnectionTypeConfigMapObj[]>;

  /** Watch connections in a namespace that are available for model serving. */
  useServingConnections: (
    namespace?: string,
    includeDashboardFalse?: boolean,
    skipCompatibilityCheck?: boolean,
  ) => HostApiFetchState<Connection[]>;

  /** Fetch the ordered list of serving runtime template names from DashboardConfig. */
  getDashboardConfigTemplateOrder: (ns: string) => Promise<string[]>;

  /** Fetch the disabled serving runtime template names from DashboardConfig. */
  getDashboardConfigTemplateDisablement: (ns: string) => Promise<string[]>;

  /** Fetch model serving metrics (Prometheus queries) for a given inference service. */
  useModelServingMetrics: (
    type: string,
    queries: Record<string, string>,
    timeframe: string,
    lastUpdateTime: number,
    setLastUpdateTime: (time: number) => void,
    refreshInterval: string,
    namespace: string,
  ) => { data: Record<string, HostApiFetchStateObject<unknown[]>>; refresh: () => void };

  /** Get serving platform statuses (KServe, NIM availability). */
  useServingPlatformStatuses: (shouldRefreshNimAvailability?: boolean) => ServingPlatformStatuses;

  /** Check whether a project has NIM support enabled. */
  isProjectNIMSupported: (currentProject: ProjectKind) => boolean;

  /** Build the route path to registered model deployments. */
  registeredModelDeploymentsRoute: (rmId?: string, preferredModelRegistry?: string) => string;
};

export type SecretOps = Pick<
  HostApiInfraServices,
  | 'createSecret'
  | 'getSecret'
  | 'deleteSecret'
  | 'patchSecretWithOwnerReference'
  | 'patchSecretWithProtocolAnnotation'
>;
