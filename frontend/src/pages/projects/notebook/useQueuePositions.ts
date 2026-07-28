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
  notebookName: string;
  queueName: string;
  workloadName: string;
};

export type NotebookQueueMetrics = {
  queuePosition: number;
  queueTotal: number;
};

/**
 * Fetches queue positions from the Kueue Visibility API for pending workloads.
 * Returns a map of notebook name → 1-indexed position and pending queue total.
 *
 * Handles 403 gracefully: when the user lacks RBAC for the Visibility API,
 * metrics are silently omitted (no error, empty map).
 */
export const useQueuePositions = (
  namespace: string | undefined,
  kueueStatusByNotebookName: Record<string, KueueWorkloadStatusWithMessage | null>,
): Record<string, NotebookQueueMetrics> => {
  const [metrics, setMetrics] = React.useState<Record<string, NotebookQueueMetrics>>({});

  const queuedEntries: QueuedEntry[] = React.useMemo(() => {
    const entries: QueuedEntry[] = [];
    for (const [notebookName, status] of Object.entries(kueueStatusByNotebookName)) {
      if (
        status &&
        PENDING_STATUSES.includes(status.status) &&
        status.queueName &&
        status.workloadName
      ) {
        entries.push({
          notebookName,
          queueName: status.queueName,
          workloadName: status.workloadName,
        });
      }
    }
    return entries;
  }, [kueueStatusByNotebookName]);

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

      const newMetrics: Record<string, NotebookQueueMetrics> = {};

      await Promise.all(
        Array.from(byQueue.entries()).map(async ([queueName, entries]) => {
          try {
            const summary = await getPendingWorkloads(namespace, queueName);
            const queueTotal = summary.items.length;
            for (const entry of entries) {
              const found = summary.items.find((pw) => pw.metadata.name === entry.workloadName);
              if (found != null) {
                newMetrics[entry.notebookName] = {
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
