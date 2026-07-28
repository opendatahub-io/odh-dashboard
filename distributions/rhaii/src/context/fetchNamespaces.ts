import type { ProjectKind } from '@odh-dashboard/k8s-core';

type K8sNamespaceItem = {
  metadata?: { name?: string };
  status?: { phase?: string };
};

type K8sNamespaceList = {
  items?: K8sNamespaceItem[];
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null;

const parseNamespaceList = (value: unknown): K8sNamespaceList => {
  if (!isRecord(value)) {
    return { items: [] };
  }
  const { items } = value;
  if (!Array.isArray(items)) {
    return { items: [] };
  }
  return {
    items: items.filter((item): item is K8sNamespaceItem => isRecord(item)),
  };
};

const namespaceToProject = (name: string, phase?: string): ProjectKind => ({
  apiVersion: 'v1',
  kind: 'Namespace',
  metadata: { name },
  status: {
    phase: phase === 'Terminating' ? 'Terminating' : 'Active',
  },
});

export const FETCH_TIMEOUT_MS = 30_000;

const fetchNamespaces = async (signal?: AbortSignal): Promise<ProjectKind[]> => {
  const resp = await fetch('/api/k8s/api/v1/namespaces', { signal });
  if (!resp.ok) {
    throw new Error(`Failed to list namespaces (HTTP ${resp.status})`);
  }
  const data = parseNamespaceList(await resp.json());
  return (data.items ?? [])
    .map((item) => {
      const name = item.metadata?.name;
      if (!name) {
        return null;
      }
      return namespaceToProject(name, item.status?.phase);
    })
    .filter((project): project is ProjectKind => project !== null);
};

export default fetchNamespaces;
