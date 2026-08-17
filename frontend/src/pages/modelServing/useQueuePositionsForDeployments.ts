import * as React from 'react';
import { useDeepCompareMemoize } from '@odh-dashboard/ui-core/hooks';
import { KueueWorkloadStatus, type KueueWorkloadStatusWithMessage } from '#~/concepts/kueue/types';
import { getPendingWorkloads } from '#~/api/k8s/pendingWorkloads';

const PENDING_STATUSES: KueueWorkloadStatus[] = [
  KueueWorkloadStatus.Queued,
  KueueWorkloadStatus.Inadmissible,
];

const REFRESH_INTERVAL = 30_000;

type QueuedEntry = {
  deploymentKey: string;
  queueName: string;
  workloadName: string;
};

export type DeploymentQueueMetrics = {
  queuePosition: number;
  queueTotal: number;
};

/**
 * Fetches queue positions from the Kueue Visibility API for pending model deployments.
 * Returns a map of deployment key → 1-indexed position and pending queue total.
 *
 * Keys match `buildModelDeploymentKey` (e.g. `InferenceService/my-model`).
 *
 * Handles 403 gracefully: when the user lacks RBAC for the Visibility API,
 * metrics are silently omitted (no error, empty map).
 */
export const useQueuePositionsForDeployments = (
  namespace: string | undefined,
  kueueStatusByDeploymentKey: Record<string, KueueWorkloadStatusWithMessage | null>,
): Record<string, DeploymentQueueMetrics> => {
  const [metrics, setMetrics] = React.useState<Record<string, DeploymentQueueMetrics>>({});

  const queuedEntries: QueuedEntry[] = React.useMemo(() => {
    const entries: QueuedEntry[] = [];
    for (const [deploymentKey, status] of Object.entries(kueueStatusByDeploymentKey)) {
      if (
        status &&
        PENDING_STATUSES.includes(status.status) &&
        status.queueName &&
        status.workloadName
      ) {
        entries.push({
          deploymentKey,
          queueName: status.queueName,
          workloadName: status.workloadName,
        });
      }
    }
    return entries;
  }, [kueueStatusByDeploymentKey]);

  const stableEntries = useDeepCompareMemoize(queuedEntries);

  React.useEffect(() => {
    if (!namespace || stableEntries.length === 0) {
      setMetrics({});
      return undefined;
    }

    let cancelled = false;
    let latestRequestId = 0;

    const fetchPositions = async (): Promise<void> => {
      const requestId = ++latestRequestId;
      const byQueue = new Map<string, QueuedEntry[]>();
      for (const entry of stableEntries) {
        const list = byQueue.get(entry.queueName) ?? [];
        list.push(entry);
        byQueue.set(entry.queueName, list);
      }

      const newMetrics: Record<string, DeploymentQueueMetrics> = {};

      await Promise.all(
        Array.from(byQueue.entries()).map(async ([queueName, entries]) => {
          try {
            const summary = await getPendingWorkloads(namespace, queueName);
            if (!Array.isArray(summary.items)) {
              return;
            }
            const queueTotal = summary.items.length;
            for (const entry of entries) {
              const found = summary.items.find((pw) => pw.metadata.name === entry.workloadName);
              if (
                found != null &&
                Number.isInteger(found.positionInLocalQueue) &&
                found.positionInLocalQueue >= 0
              ) {
                newMetrics[entry.deploymentKey] = {
                  queuePosition: found.positionInLocalQueue + 1,
                  queueTotal,
                };
              }
            }
          } catch {
            // Silently omit positions on any error (403 = no RBAC, others = optional data)
          }
        }),
      );

      if (!cancelled && requestId === latestRequestId) {
        setMetrics(newMetrics);
      }
    };

    fetchPositions();
    const intervalId = setInterval(fetchPositions, REFRESH_INTERVAL);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, [namespace, stableEntries]);

  return metrics;
};
