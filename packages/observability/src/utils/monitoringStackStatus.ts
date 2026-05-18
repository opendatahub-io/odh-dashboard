import type {
  DataScienceClusterInitializationKindStatus,
  K8sCondition,
} from '@odh-dashboard/internal/k8sTypes';

/**
 * Conditions checked on the DSCI to decide whether Perses dashboards can load.
 *
 * Evaluated in order — the first failing condition drives the empty-state message.
 *
 * - `MonitoringReady` — aggregate condition added by PR #3485 in the ODH operator.
 *   Reflects the overall health of the Monitoring service:
 *     True  → monitoring service is healthy
 *     False + reason "Removed" → monitoring is not enabled in DSCI
 *     False + forwarded reason/message → MonitoringAvailable is False on the Monitoring CR
 *     Unknown → initializing or error retrieving Monitoring CR status
 *
 * - `PersesAvailable` — mirrored sub-condition from the Monitoring CR.
 *   False when Perses CRDs are absent or the Perses instance failed to deploy.
 *   Checked separately because MonitoringReady may be True (prerequisites met)
 *   while Perses specifically is not yet available.
 *
 * @see {@link https://github.com/opendatahub-io/opendatahub-operator/pull/3485}
 * @see {@link https://issues.redhat.com/browse/RHOAIENG-59122}
 */
const BLOCKING_CONDITIONS: readonly {
  type: string;
  headline: string;
}[] = [
  {
    type: 'MonitoringReady',
    headline: 'Monitoring is not available.',
  },
  {
    type: 'PersesAvailable',
    headline: 'Perses is not available — observability dashboards cannot load.',
  },
];

export type MonitoringStackSignal =
  | { kind: 'ready' }
  | {
      kind: 'unavailable';
      headline: string;
      operatorMessage?: string;
      reason?: string;
    }
  | { kind: 'unknown' };

export const getMonitoringStackSignal = (
  dsciStatus: DataScienceClusterInitializationKindStatus | null,
): MonitoringStackSignal => {
  if (!dsciStatus || dsciStatus.conditions.length === 0) {
    return { kind: 'unknown' };
  }

  const byType = new Map<string, K8sCondition>();
  for (const c of dsciStatus.conditions) {
    byType.set(c.type, c);
  }

  const matched = BLOCKING_CONDITIONS.filter((b) => byType.has(b.type));

  if (matched.length === 0) {
    return { kind: 'unknown' };
  }

  for (const blocker of matched) {
    const condition = byType.get(blocker.type);
    if (condition && condition.status !== 'True') {
      return {
        kind: 'unavailable',
        headline: blocker.headline,
        operatorMessage: condition.message,
        reason: condition.reason,
      };
    }
  }

  return { kind: 'ready' };
};
