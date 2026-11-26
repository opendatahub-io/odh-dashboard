import type { ProjectKind } from '@odh-dashboard/k8s-core';
import { isValidK8sName, KnownLabels, NamespacePhase } from '@odh-dashboard/k8s-core';
import type { AiClassificationUnknown } from './aiClassification';

/**
 * A project as the RHAII UI knows it. The `can*` fields come from the Core
 * BFF's namespace discovery on xKS (`actions`); they are absent on platforms
 * without that endpoint, where every listed project keeps today's behaviour.
 */
export type RhaiiProject = ProjectKind & {
  canView?: boolean;
  canDeploy?: boolean;
  canEdit?: boolean;
  canStartStop?: boolean;
  canDelete?: boolean;
  canCreateTokenAuth?: boolean;
  canManageTokenAuth?: boolean;
  /**
   * Listed while discovery was unavailable: the caller may list the
   * namespace, but nothing it may do there is known until a lookup by name.
   */
  actionsUnverified?: boolean;
} & AiClassificationUnknown;

type K8sNamespaceItem = {
  name?: string;
  displayName?: string;
  phase?: string;
  isAiProject?: unknown;
};

type K8sNamespaceList = {
  items?: K8sNamespaceItem[];
};

type NamespaceAccessItem = {
  name?: unknown;
  displayName?: unknown;
  phase?: unknown;
  isAiProject?: unknown;
  actions?: unknown;
  permissions?: unknown;
};

type NamespaceAccessList = {
  source?: unknown;
  complete?: unknown;
  issueCodes: string[];
  namespaces: NamespaceAccessItem[];
};

// Issues that leave every authorized namespace in the result: a failed review
// in the dashboard namespace, and a namespace returned with phase Unknown.
// Any other issue may have dropped a namespace.
const ISSUES_KEEPING_EVERY_NAMESPACE = new Set([
  'SHARED_ACCESS_REVIEW_FAILED',
  'NAMESPACE_READ_FAILED',
]);

// The discovery endpoints exist only on xKS; elsewhere they return 404 and the
// UI keeps using the namespace list and lookup it always used.
const NAMESPACE_ACCESS_PATH = '/api/v1/namespace-access';
const NAMESPACES_PATH = '/api/v1/namespaces';
// Phase reported by the BFF when the caller is authorized in a namespace but
// cannot read the Namespace object itself.
const PHASE_UNKNOWN = 'Unknown';

const NO_ACCESS_MESSAGE = 'No access to that project, or it does not exist.';

/**
 * The BFF decided the caller has no access to the project (or it does not
 * exist), as opposed to a lookup that could not be completed.
 */
export class ProjectAccessDeniedError extends Error {
  constructor() {
    super(NO_ACCESS_MESSAGE);
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parseNamespaceList = (value: unknown): K8sNamespaceList => {
  if (!isRecord(value)) {
    throw new Error('Invalid namespace list response');
  }
  const { data } = value;
  if (!Array.isArray(data)) {
    throw new Error('Invalid namespace list response');
  }
  return {
    items: data.filter((item): item is K8sNamespaceItem => isRecord(item)),
  };
};

const parseNamespaceAccessList = (value: unknown): NamespaceAccessList => {
  const data = isRecord(value) ? value.data : undefined;
  if (!isRecord(data) || !Array.isArray(data.namespaces)) {
    throw new Error('Invalid namespace list response');
  }
  return {
    source: data.source,
    complete: data.complete,
    issueCodes: Array.isArray(data.issues)
      ? data.issues.flatMap((issue) =>
          isRecord(issue) && typeof issue.code === 'string' ? [issue.code] : [],
        )
      : [],
    namespaces: data.namespaces.filter((item): item is NamespaceAccessItem => isRecord(item)),
  };
};

const namespaceToProject = (
  name: string,
  phase?: unknown,
  displayName?: unknown,
  isAiProject?: unknown,
): ProjectKind => ({
  apiVersion: 'v1',
  kind: 'Namespace',
  metadata: {
    name,
    ...(typeof displayName === 'string' &&
      displayName.length > 0 && {
        annotations: { 'openshift.io/display-name': displayName },
      }),
    // Only boolean true marks an AI project; the shared classifier reads this label.
    ...(isAiProject === true && {
      labels: { [KnownLabels.DASHBOARD_RESOURCE]: 'true' },
    }),
  },
  status: {
    // Unknown phases must never become selectable by default.
    phase: phase === NamespacePhase.Active ? NamespacePhase.Active : NamespacePhase.Terminating,
  },
});

/**
 * Maps one entry of the BFF's namespace discovery. The BFF only returns
 * namespaces the caller is authorized in, so an `Unknown` phase (the caller
 * cannot read the Namespace object) is selectable and labelled by its name.
 */
// The reviews each token action is derived from (see DeriveNamespaceActions).
const CREATE_TOKEN_REVIEWS: [string, string][] = [
  ['serving.kserve.io/llminferenceservices', 'get'],
  ['core/secrets', 'create'],
  ['core/serviceaccounts', 'get'],
  ['core/serviceaccounts', 'create'],
  ['rbac.authorization.k8s.io/roles', 'get'],
  ['rbac.authorization.k8s.io/roles', 'create'],
  ['rbac.authorization.k8s.io/rolebindings', 'get'],
  ['rbac.authorization.k8s.io/rolebindings', 'create'],
];
const TOKEN_ACTION_REVIEWS: Record<string, [string, string][]> = {
  createTokenAuth: CREATE_TOKEN_REVIEWS,
  manageTokenAuth: [
    ...CREATE_TOKEN_REVIEWS,
    ['core/secrets', 'list'],
    ['core/secrets', 'update'],
    ['core/secrets', 'delete'],
  ],
};

const accessToProject = (item: NamespaceAccessItem): RhaiiProject | null => {
  const { name, phase, actions } = item;
  if (typeof name !== 'string' || name.length === 0) {
    return null;
  }
  const usable = phase === NamespacePhase.Active || phase === PHASE_UNKNOWN;
  const allowed = (action: string) => isRecord(actions) && actions[action] === true;
  // A token action that is off only because a review could not be decided is
  // unknown, not denied: treating it as denied would disable token auth and
  // deploy a new model without authentication. Unknown leaves it to
  // Kubernetes, and the dry run, to decide.
  const decision = (key: string, verb: string): unknown => {
    const decisions = isRecord(item.permissions) ? item.permissions[key] : undefined;
    return isRecord(decisions) ? decisions[verb] : undefined;
  };
  // Unknown only when no review the action needs was denied and one failed:
  // the action is off only because of that failure.
  const tokenAction = (action: string): boolean | undefined => {
    if (allowed(action)) {
      return true;
    }
    const reviews = TOKEN_ACTION_REVIEWS[action];
    const decisions = reviews.map(([key, verb]) => decision(key, verb));
    return decisions.includes('error') && decisions.every((d) => d === 'allowed' || d === 'error')
      ? undefined
      : false;
  };
  return {
    ...namespaceToProject(
      name,
      usable ? NamespacePhase.Active : undefined,
      item.displayName,
      item.isAiProject,
    ),
    canView: allowed('view'),
    canDeploy: allowed('deploy'),
    canEdit: allowed('edit'),
    canStartStop: allowed('startStop'),
    canDelete: allowed('delete'),
    canCreateTokenAuth: tokenAction('createTokenAuth'),
    canManageTokenAuth: tokenAction('manageTokenAuth'),
    ...(typeof item.isAiProject !== 'boolean' && { aiClassificationUnknown: true }),
  };
};

export const FETCH_TIMEOUT_MS = 30_000;

/**
 * The caller's namespaces cannot be listed exhaustively. `projects` holds the
 * ones the BFF could still authorize (from configured or requested
 * candidates); manual entry stays available for the rest.
 */
export class NamespaceListUnavailableError extends Error {
  readonly projects?: RhaiiProject[];

  constructor(message: string, projects?: RhaiiProject[]) {
    super(message);
    this.projects = projects;
  }
}

type NamespaceResponse = {
  data?: {
    name?: unknown;
    displayName?: unknown;
    phase?: unknown;
    isAiProject?: unknown;
    actions?: unknown;
  };
};

const lookupError = (status: number): Error => {
  if (status === 403 || status === 404) {
    return new ProjectAccessDeniedError();
  }
  if (status === 401) {
    return new Error('Sign in again to search for projects.');
  }
  return new Error('Unable to search for projects. Try again later.');
};

const fetchLegacyNamespaceByName = async (
  name: string,
  signal?: AbortSignal,
): Promise<RhaiiProject> => {
  const response = await fetch(`${NAMESPACES_PATH}/${encodeURIComponent(name)}`, { signal });
  if (!response.ok) {
    throw lookupError(response.status);
  }
  const body: NamespaceResponse = await response.json();
  if (body.data?.name !== name || body.data.phase !== NamespacePhase.Active) {
    throw new ProjectAccessDeniedError();
  }
  return namespaceToProject(name, body.data.phase, body.data.displayName, body.data.isAiProject);
};

export const fetchNamespaceByName = async (
  name: string,
  signal?: AbortSignal,
): Promise<RhaiiProject> => {
  if (name.length > 63 || !isValidK8sName(name)) {
    throw new Error('Enter a valid resource name.');
  }
  const response = await fetch(`${NAMESPACE_ACCESS_PATH}/${encodeURIComponent(name)}`, {
    signal,
  });
  if (response.status === 404) {
    // Either the discovery endpoint is absent (not xKS) or the namespace does
    // not exist; the namespace lookup answers both correctly.
    return fetchLegacyNamespaceByName(name, signal);
  }
  if (!response.ok) {
    throw lookupError(response.status);
  }
  const body: NamespaceResponse = await response.json();
  const project = body.data && body.data.name === name ? accessToProject(body.data) : null;
  if (!project || project.status?.phase !== NamespacePhase.Active) {
    throw new ProjectAccessDeniedError();
  }
  return project;
};

const fetchLegacyNamespaces = async (signal?: AbortSignal): Promise<RhaiiProject[]> => {
  const resp = await fetch(NAMESPACES_PATH, { signal });
  if (!resp.ok) {
    if (resp.status === 403) {
      throw new NamespaceListUnavailableError('Namespace listing is not permitted');
    }
    throw new Error(`Failed to list namespaces (HTTP ${resp.status})`);
  }
  const data = parseNamespaceList(await resp.json());
  return (data.items ?? [])
    .map((item): RhaiiProject | null => {
      const { name } = item;
      if (typeof name !== 'string' || name.length === 0) {
        return null;
      }
      return namespaceToProject(name, item.phase, item.displayName, item.isAiProject);
    })
    .filter((project): project is RhaiiProject => project !== null);
};

const withoutVerifiedActions = (project: RhaiiProject): RhaiiProject => ({
  ...project,
  canView: false,
  canDeploy: false,
  canEdit: false,
  canStartStop: false,
  canDelete: false,
  canCreateTokenAuth: false,
  canManageTokenAuth: false,
  actionsUnverified: true,
});

const fetchNamespaces = async (signal?: AbortSignal): Promise<RhaiiProject[]> => {
  const resp = await fetch(NAMESPACE_ACCESS_PATH, { signal });
  if (resp.status === 404) {
    return fetchLegacyNamespaces(signal);
  }
  if (resp.status === 503) {
    // Discovery found nothing because its sources or reviews failed. Listing a
    // namespace says nothing about what the caller may do in it, so the
    // listed names are offered for selection only: nothing is watched or
    // offered there until a lookup by name decides it. The result stays
    // partial, so manual entry remains available.
    // Any failure of that list, a timeout included (discovery may have used
    // most of the request's time before answering 503), still leaves manual
    // entry; a caller that cancelled ignores the result.
    let browsable: RhaiiProject[] = [];
    try {
      browsable = (await fetchLegacyNamespaces(signal)).map(withoutVerifiedActions);
    } catch {
      browsable = [];
    }
    throw new NamespaceListUnavailableError('Namespace discovery is unavailable', browsable);
  }
  if (!resp.ok) {
    throw new Error(`Failed to list namespaces (HTTP ${resp.status})`);
  }
  const list = parseNamespaceAccessList(await resp.json());
  const projects = list.namespaces
    .map(accessToProject)
    .filter((project): project is RhaiiProject => project !== null);
  const exhaustive =
    list.source === 'cluster-list' &&
    (list.complete === true ||
      (list.issueCodes.length > 0 &&
        list.issueCodes.every((code) => ISSUES_KEEPING_EVERY_NAMESPACE.has(code))));
  if (!exhaustive) {
    // Discovery from candidates, or one that hit failures that may have
    // dropped a namespace or the candidate cap, is not exhaustive: show what
    // was authorized and keep manual entry available for the rest.
    throw new NamespaceListUnavailableError('Namespace listing is partial', projects);
  }
  return projects;
};

export default fetchNamespaces;
