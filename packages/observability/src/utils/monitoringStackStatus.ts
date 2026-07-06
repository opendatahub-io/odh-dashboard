import type {
  K8sCondition,
  DataScienceClusterInitializationKindStatus,
} from '@odh-dashboard/k8s-core';

export type MonitoringStatus =
  | { available: true }
  | { available: false; reason: 'monitoring-not-ready' }
  | { available: false; reason: 'perses-not-available' };

export const getMonitoringStatus = (
  dsciStatus: DataScienceClusterInitializationKindStatus | null,
): MonitoringStatus => {
  const conditions = dsciStatus?.conditions;
  if (!Array.isArray(conditions) || conditions.length === 0) {
    return { available: false, reason: 'monitoring-not-ready' };
  }

  const byType = new Map<string, K8sCondition>();
  for (const c of conditions) {
    byType.set(c.type, c);
  }

  const monitoringReady = byType.get('MonitoringReady');
  if (monitoringReady && monitoringReady.status !== 'True') {
    return { available: false, reason: 'monitoring-not-ready' };
  }

  const persesAvailable = byType.get('PersesAvailable');
  if (persesAvailable && persesAvailable.status !== 'True') {
    return { available: false, reason: 'perses-not-available' };
  }

  return { available: true };
};

export const isMonitoringStackAvailable = (
  dsciStatus: DataScienceClusterInitializationKindStatus | null,
): boolean => getMonitoringStatus(dsciStatus).available;
