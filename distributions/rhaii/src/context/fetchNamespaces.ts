import type { ProjectKind } from '@odh-dashboard/k8s-core';
import { isValidK8sName, NamespacePhase } from '@odh-dashboard/k8s-core';

/**
 * A project as the RHAII UI knows it. `canDeploy` comes from the Core BFF's
 * namespace discovery on xKS (`actions.deploy`); it is absent on platforms
 * without that endpoint, where every listed project keeps today's behaviour.
 */
export type RhaiiProject = ProjectKind & { canDeploy?: boolean };

type K8sNamespaceItem = { name?: string; displayName?: string; phase?: string };

type K8sNamespaceList = {
  items?: K8sNamespaceItem[];
};

type NamespaceAccessItem = {
  name?: unknown;
  displayName?: unknown;
  phase?: unknown;
  actions?: unknown;
};

type NamespaceAccessList = {
  source?: unknown;
  namespaces: NamespaceAccessItem[];
};

// The discovery endpoints exist only on xKS; elsewhere they return 404 and the
// UI keeps using the namespace list and lookup it always used.
const NAMESPACE_ACCESS_PATH = '/api/v1/namespace-access';
const NAMESPACES_PATH = '/api/v1/namespaces';
// Phase reported by the BFF when the caller is authorized in a namespace but
// cannot read the Namespace object itself.
const PHASE_UNKNOWN = 'Unknown';

const NO_ACCESS_MESSAGE = 'No access to that project, or it does not exist.';

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
    namespaces: data.namespaces.filter((item): item is NamespaceAccessItem => isRecord(item)),
  };
};

const namespaceToProject = (name: string, phase?: string): ProjectKind => ({
  apiVersion: 'v1',
  kind: 'Namespace',
  metadata: { name },
  status: {
    // Unknown phases must never become selectable by default.
    phase: phase === NamespacePhase.Active ? NamespacePhase.Active : NamespacePhase.Terminating,
  },
});

const withDisplayName = (project: ProjectKind, displayName: unknown): ProjectKind => ({
  ...project,
  metadata: {
    name: project.metadata.name,
    ...(typeof displayName === 'string' &&
      displayName.length > 0 && {
        annotations: { 'openshift.io/display-name': displayName },
      }),
  },
});

/**
 * Maps one entry of the BFF's namespace discovery. The BFF only returns
 * namespaces the caller is authorized in, so an `Unknown` phase (the caller
 * cannot read the Namespace object) is selectable and labelled by its name.
 */
const accessToProject = (item: NamespaceAccessItem): RhaiiProject | null => {
  const { name, phase, actions } = item;
  if (typeof name !== 'string' || name.length === 0) {
    return null;
  }
  const usable = phase === NamespacePhase.Active || phase === PHASE_UNKNOWN;
  return {
    ...withDisplayName(
      namespaceToProject(name, usable ? NamespacePhase.Active : undefined),
      item.displayName,
    ),
    canDeploy: isRecord(actions) && actions.deploy === true,
  };
};

export const FETCH_TIMEOUT_MS = 30_000;

/**
 * The caller's namespaces cannot be listed exhaustively. `projects` holds the
 * ones the BFF could still authorize (from configured candidates or label
 * discovery); manual entry stays available for the rest.
 */
export class NamespaceListUnavailableError extends Error {
  readonly projects?: RhaiiProject[];

  constructor(message: string, projects?: RhaiiProject[]) {
    super(message);
    this.projects = projects;
  }
}

type NamespaceResponse = {
  data?: { name?: unknown; displayName?: unknown; phase?: unknown; actions?: unknown };
};

const lookupError = (status: number): Error => {
  if (status === 403 || status === 404) {
    return new Error(NO_ACCESS_MESSAGE);
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
    throw new Error(NO_ACCESS_MESSAGE);
  }
  return withDisplayName(namespaceToProject(name, NamespacePhase.Active), body.data.displayName);
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
    throw new Error(NO_ACCESS_MESSAGE);
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
      return withDisplayName(namespaceToProject(name, item.phase), item.displayName);
    })
    .filter((project): project is RhaiiProject => project !== null);
};

const fetchNamespaces = async (signal?: AbortSignal): Promise<RhaiiProject[]> => {
  const resp = await fetch(NAMESPACE_ACCESS_PATH, { signal });
  if (resp.status === 404) {
    return fetchLegacyNamespaces(signal);
  }
  if (!resp.ok) {
    throw new Error(`Failed to list namespaces (HTTP ${resp.status})`);
  }
  const list = parseNamespaceAccessList(await resp.json());
  const projects = list.namespaces
    .map(accessToProject)
    .filter((project): project is RhaiiProject => project !== null);
  if (list.source !== 'cluster-list') {
    // Discovery from candidates is not exhaustive: show what was authorized
    // and keep manual entry available.
    throw new NamespaceListUnavailableError('Namespace listing is partial', projects);
  }
  return projects;
};

export default fetchNamespaces;
