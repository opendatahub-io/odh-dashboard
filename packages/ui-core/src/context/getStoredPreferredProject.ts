import type { ProjectKind } from '@odh-dashboard/k8s-core';

export const PREFERRED_NAMESPACE_STORAGE_KEY = 'mod-arch.namespace.lastUsed';

export const getStoredPreferredProject = (projects: ProjectKind[]): ProjectKind | undefined => {
  let raw: string | null;
  try {
    raw = localStorage.getItem(PREFERRED_NAMESPACE_STORAGE_KEY);
  } catch {
    return undefined;
  }
  if (!raw) {
    return undefined;
  }
  let storedNamespace: string | null = null;
  try {
    const parsed = JSON.parse(raw);
    if (typeof parsed === 'string') {
      storedNamespace = parsed;
    }
  } catch {
    if (typeof raw === 'string' && raw.length > 0) {
      storedNamespace = raw;
    }
  }
  if (!storedNamespace) {
    return undefined;
  }
  return projects.find((p) => p.metadata.name === storedNamespace);
};
