import type { ProjectKind } from '@odh-dashboard/k8s-core';
import { isValidK8sName, NamespacePhase } from '@odh-dashboard/k8s-core';

type K8sNamespaceItem = { name?: string; displayName?: string; phase?: string };

type K8sNamespaceList = {
  items?: K8sNamespaceItem[];
};

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

const namespaceToProject = (name: string, phase?: string): ProjectKind => ({
  apiVersion: 'v1',
  kind: 'Namespace',
  metadata: { name },
  status: {
    // Unknown phases must never become selectable by default.
    phase: phase === NamespacePhase.Active ? NamespacePhase.Active : NamespacePhase.Terminating,
  },
});

export const FETCH_TIMEOUT_MS = 30_000;

export class NamespaceListUnavailableError extends Error {}

type NamespaceResponse = {
  data?: { name?: unknown; displayName?: unknown; phase?: unknown };
};

export const fetchNamespaceByName = async (
  name: string,
  signal?: AbortSignal,
): Promise<ProjectKind> => {
  if (name.length > 63 || !isValidK8sName(name)) {
    throw new Error('Enter a valid resource name.');
  }
  const response = await fetch(`/api/v1/namespaces/${encodeURIComponent(name)}`, { signal });
  if (!response.ok) {
    if (response.status === 403 || response.status === 404) {
      throw new Error('No access to that project, or it does not exist.');
    }
    if (response.status === 401) {
      throw new Error('Sign in again to search for projects.');
    }
    throw new Error('Unable to search for projects. Try again later.');
  }
  const body: NamespaceResponse = await response.json();
  if (body.data?.name !== name || body.data.phase !== NamespacePhase.Active) {
    throw new Error('No access to that project, or it does not exist.');
  }
  return {
    ...namespaceToProject(name, typeof body.data.phase === 'string' ? body.data.phase : undefined),
    metadata: {
      name,
      ...(typeof body.data.displayName === 'string' && {
        annotations: { 'openshift.io/display-name': body.data.displayName },
      }),
    },
  };
};

const fetchNamespaces = async (signal?: AbortSignal): Promise<ProjectKind[]> => {
  const resp = await fetch('/api/v1/namespaces', { signal });
  if (!resp.ok) {
    if (resp.status === 403) {
      throw new NamespaceListUnavailableError('Namespace listing is not permitted');
    }
    throw new Error(`Failed to list namespaces (HTTP ${resp.status})`);
  }
  const data = parseNamespaceList(await resp.json());
  return (data.items ?? [])
    .map((item): ProjectKind | null => {
      const { name } = item;
      if (typeof name !== 'string' || name.length === 0) {
        return null;
      }
      return {
        ...namespaceToProject(name, item.phase),
        metadata: {
          name,
          ...(typeof item.displayName === 'string' && {
            annotations: { 'openshift.io/display-name': item.displayName },
          }),
        },
      };
    })
    .filter((project): project is ProjectKind => project !== null);
};

export default fetchNamespaces;
