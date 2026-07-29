import type {
  AccessReviewResourceAttributes,
  DashboardConfigKind,
  K8sResourceCommon,
  K8sWatchResult,
  NamespaceApplicationCase,
  PersistentVolumeClaimKind,
  SecretKind,
  TemplateKind,
} from '@odh-dashboard/k8s-core';

export type { K8sWatchResult } from '@odh-dashboard/k8s-core';

/**
 * Services provided by the host application to federated modules via HostApiContext.
 *
 * Federated modules must not import host internals directly; instead they consume
 * these services through the context bridge.
 */
export type HostApiServices = {
  /** The namespace where the dashboard operator is installed (e.g. "opendatahub" or "redhat-ods-applications"). */
  dashboardNamespace: string;

  /** Perform a SelfSubjectAccessReview to check whether the current user has a specific permission. */
  checkAccess: (attrs: Required<AccessReviewResourceAttributes>) => Promise<boolean>;

  /** Fetch all secrets in a namespace that match a given label selector. */
  getSecretsByLabel: (label: string, namespace: string) => Promise<SecretKind[]>;

  /** Fetch all PVCs in a project that are managed by the dashboard. */
  getDashboardPvcs: (projectName: string) => Promise<PersistentVolumeClaimKind[]>;

  /** Fetch (or refresh) the DashboardConfig CR that controls feature flags and platform settings. */
  fetchDashboardConfig: (forceRefresh?: boolean) => Promise<DashboardConfigKind>;

  /** Watch serving runtime templates in a namespace. Returns a K8s watch-style tuple. */
  useTemplates: (namespace?: string) => K8sWatchResult<TemplateKind[]>;

  /** Mark a project as supporting a specific serving platform (e.g. KServe, ModelMesh). */
  setProjectServingPlatform: (
    name: string,
    servingPlatform: NamespaceApplicationCase,
    dryRun?: boolean,
  ) => Promise<string>;

  /** Create a new Secret resource. */
  createSecret: (data: SecretKind, opts?: { dryRun?: boolean }) => Promise<SecretKind>;
  /** Fetch a Secret by namespace and name. */
  getSecret: (namespace: string, name: string) => Promise<SecretKind>;
  /** Delete a Secret by namespace and name. */
  deleteSecret: (namespace: string, name: string) => Promise<unknown>;
  /** Patch a Secret to add an owner reference, linking it to a parent resource. */
  patchSecretWithOwnerReference: (
    secret: SecretKind,
    owner: K8sResourceCommon & { metadata: { name: string } },
    uid: string,
  ) => Promise<SecretKind>;
  /** Patch a Secret to set the connection-type protocol annotation. */
  patchSecretWithProtocolAnnotation: (secret: SecretKind, protocol: string) => Promise<SecretKind>;
};

export type SecretOps = Pick<
  HostApiServices,
  | 'createSecret'
  | 'getSecret'
  | 'deleteSecret'
  | 'patchSecretWithOwnerReference'
  | 'patchSecretWithProtocolAnnotation'
>;
