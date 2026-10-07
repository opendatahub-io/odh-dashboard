import React from 'react';

const listeners = new Set<() => void>();

export type PostDeployAlertEntry = {
  modelName?: string;
  boundPathname?: string;
};

type PostDeployAlertMap = Record<string, PostDeployAlertEntry>;

let alerts: PostDeployAlertMap = {};
const pendingDismissTimeouts = new Map<string, ReturnType<typeof setTimeout>>();

const notify = (): void => {
  listeners.forEach((listener) => listener());
};

const clearPendingDismiss = (id: string): void => {
  const timeoutId = pendingDismissTimeouts.get(id);
  if (timeoutId !== undefined) {
    clearTimeout(timeoutId);
    pendingDismissTimeouts.delete(id);
  }
};

export const enqueuePostDeployAlert = (id: string, entry: PostDeployAlertEntry = {}): void => {
  clearPendingDismiss(id);
  if (!Object.prototype.hasOwnProperty.call(alerts, id)) {
    alerts = { ...alerts, [id]: entry };
    notify();
  }
};

export const dismissPostDeployAlert = (id: string): void => {
  clearPendingDismiss(id);
  if (!Object.prototype.hasOwnProperty.call(alerts, id)) {
    return;
  }
  alerts = Object.fromEntries(Object.entries(alerts).filter(([alertId]) => alertId !== id));
  notify();
};

/**
 * Binds an alert to the pathname where it was first shown.
 * On a later call with a different pathname (e.g. project switch while still mounted),
 * the alert is dismissed.
 */
export const syncPostDeployAlertPath = (id: string, pathname: string): void => {
  if (!Object.prototype.hasOwnProperty.call(alerts, id)) {
    return;
  }
  const entry = alerts[id];
  if (entry.boundPathname === undefined) {
    alerts = { ...alerts, [id]: { ...entry, boundPathname: pathname } };
    notify();
    return;
  }
  if (entry.boundPathname !== pathname) {
    dismissPostDeployAlert(id);
  }
};

/**
 * Schedules dismiss after the alert surface unmounts.
 * Cancelled if the same alert remounts immediately (React Strict Mode).
 */
export const schedulePostDeployAlertDismiss = (id: string): void => {
  clearPendingDismiss(id);
  pendingDismissTimeouts.set(
    id,
    setTimeout(() => {
      pendingDismissTimeouts.delete(id);
      dismissPostDeployAlert(id);
    }, 0),
  );
};

/** Cancels a pending leave-dismiss (call on mount / when the alert is shown again). */
export const cancelScheduledPostDeployAlertDismiss = (id: string): void => {
  clearPendingDismiss(id);
};

export const usePostDeployAlert = (
  id: string,
): { isVisible: boolean; modelName: string | undefined } => {
  const subscribe = React.useCallback((onStoreChange: () => void) => {
    listeners.add(onStoreChange);
    return () => {
      listeners.delete(onStoreChange);
    };
  }, []);

  const getSnapshot = React.useCallback(() => {
    if (!Object.prototype.hasOwnProperty.call(alerts, id)) {
      return '0:';
    }
    return `1:${alerts[id].modelName ?? ''}`;
  }, [id]);

  const snapshot = React.useSyncExternalStore(subscribe, getSnapshot, () => '0:');
  const isVisible = snapshot.startsWith('1:');
  const modelName = isVisible ? snapshot.slice(2) || undefined : undefined;

  return { isVisible, modelName };
};

export const useHasPostDeployAlert = (id: string): boolean => usePostDeployAlert(id).isVisible;

/** Test-only: clear all alerts between tests. */
export const resetPostDeployAlerts = (): void => {
  pendingDismissTimeouts.forEach((timeoutId) => clearTimeout(timeoutId));
  pendingDismissTimeouts.clear();
  alerts = {};
  notify();
};
