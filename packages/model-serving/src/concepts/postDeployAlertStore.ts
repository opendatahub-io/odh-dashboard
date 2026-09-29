import React from 'react';

const STORAGE_KEY = 'odh-dashboard.model-serving.post-deploy-alerts';

const listeners = new Set<() => void>();

const readIds = (): string[] => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter((id): id is string => typeof id === 'string');
  } catch {
    return [];
  }
};

const writeIds = (ids: string[]): void => {
  if (ids.length === 0) {
    sessionStorage.removeItem(STORAGE_KEY);
  } else {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  }
  listeners.forEach((listener) => listener());
};

export const enqueuePostDeployAlert = (id: string): void => {
  const ids = readIds();
  if (!ids.includes(id)) {
    writeIds([...ids, id]);
  }
};

export const dismissPostDeployAlert = (id: string): void => {
  writeIds(readIds().filter((existing) => existing !== id));
};

export const useHasPostDeployAlert = (id: string): boolean => {
  const subscribe = React.useCallback((onStoreChange: () => void) => {
    listeners.add(onStoreChange);
    return () => {
      listeners.delete(onStoreChange);
    };
  }, []);

  const getSnapshot = React.useCallback(() => readIds().includes(id), [id]);

  return React.useSyncExternalStore(subscribe, getSnapshot, () => false);
};
