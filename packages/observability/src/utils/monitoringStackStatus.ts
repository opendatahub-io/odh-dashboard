import type {
  DataScienceClusterInitializationKindStatus,
  K8sCondition,
} from '@odh-dashboard/internal/k8sTypes';

const BLOCKING_CONDITION_TYPES = ['MonitoringReady', 'PersesAvailable'];

export const isMonitoringStackAvailable = (
  dsciStatus: DataScienceClusterInitializationKindStatus | null,
): boolean => {
  if (!dsciStatus || dsciStatus.conditions.length === 0) {
    return true;
  }

  const byType = new Map<string, K8sCondition>();
  for (const c of dsciStatus.conditions) {
    byType.set(c.type, c);
  }

  const matched = BLOCKING_CONDITION_TYPES.filter((t) => byType.has(t));

  if (matched.length === 0) {
    return true;
  }

  return matched.every((t) => byType.get(t)?.status === 'True');
};
