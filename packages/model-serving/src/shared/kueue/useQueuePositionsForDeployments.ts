import * as React from 'react';
import { useDeepCompareMemoize } from '@odh-dashboard/ui-core/hooks';
import type { K8sAPIOptions } from '@odh-dashboard/k8s-core';
import {
  KueueWorkloadStatus,
  type KueueWorkloadStatusWithMessage,
} from '@odh-dashboard/k8s-core/kueue/types';
import {
  ModelServingDataContext,
  type ModelServingDataServices,
} from '@odh-dashboard/model-serving/shared/contexts/ModelServingDataContext';

const PENDING_STATUSES = [KueueWorkloadStatus.Queued, KueueWorkloadStatus.Inadmissible];
const REFRESH_INTERVAL = 30_000;

type QueuedEntry = { deploymentKey: string; queueName: string; workloadName: string };
export type DeploymentQueueMetrics = { queuePosition: number; queueTotal: number };
const EMPTY_METRICS: Record<string, DeploymentQueueMetrics> = {};

/** Optional Visibility API enrichment. Missing services and failed requests produce no metrics. */
export const useQueuePositionsForDeployments = (
  namespace: string | undefined,
  kueueStatusByDeploymentKey: Record<string, KueueWorkloadStatusWithMessage | null>,
  opts?: K8sAPIOptions,
): Record<string, DeploymentQueueMetrics> => {
  const { getPendingWorkloads } = React.useContext(ModelServingDataContext);
  const queuedEntries: QueuedEntry[] = React.useMemo(
    () =>
      Object.entries(kueueStatusByDeploymentKey).flatMap(([deploymentKey, status]) =>
        status &&
        PENDING_STATUSES.includes(status.status) &&
        status.queueName &&
        status.workloadName
          ? [{ deploymentKey, queueName: status.queueName, workloadName: status.workloadName }]
          : [],
      ),
    [kueueStatusByDeploymentKey],
  );
  const stableEntries = useDeepCompareMemoize(queuedEntries);
  const signal = opts?.signal;
  const [result, setResult] = React.useState<{
    namespace?: string;
    entries: QueuedEntry[];
    service: ModelServingDataServices['getPendingWorkloads'];
    signal?: AbortSignal;
    metrics: Record<string, DeploymentQueueMetrics>;
  }>();

  React.useEffect(() => {
    if (!namespace || !getPendingWorkloads || stableEntries.length === 0 || signal?.aborted) {
      return undefined;
    }
    let cancelled = false;
    let latestRequestId = 0;
    let controller: AbortController | undefined;
    const abortRequest = () => controller?.abort();
    signal?.addEventListener('abort', abortRequest);
    const fetchPositions = async (): Promise<void> => {
      if (signal?.aborted) {
        return;
      }
      const requestId = ++latestRequestId;
      controller?.abort();
      controller = new AbortController();
      const requestSignal = controller.signal;
      const byQueue = new Map<string, QueuedEntry[]>();
      for (const entry of stableEntries) {
        const entries = byQueue.get(entry.queueName) ?? [];
        entries.push(entry);
        byQueue.set(entry.queueName, entries);
      }
      const metrics: Record<string, DeploymentQueueMetrics> = {};
      await Promise.all(
        Array.from(byQueue.entries()).map(async ([queueName, entries]) => {
          try {
            const summary = await getPendingWorkloads(namespace, queueName, {
              signal: requestSignal,
            });
            if (!Array.isArray(summary.items)) {
              return;
            }
            for (const entry of entries) {
              const found = summary.items.find((item) => item.metadata.name === entry.workloadName);
              if (
                found &&
                Number.isInteger(found.positionInLocalQueue) &&
                found.positionInLocalQueue >= 0
              ) {
                metrics[entry.deploymentKey] = {
                  queuePosition: found.positionInLocalQueue + 1,
                  queueTotal: summary.items.length,
                };
              }
            }
          } catch {
            // Visibility is optional, including forbidden, missing, and malformed responses.
          }
        }),
      );
      if (!cancelled && !requestSignal.aborted && requestId === latestRequestId) {
        setResult({
          namespace,
          entries: stableEntries,
          service: getPendingWorkloads,
          signal,
          metrics,
        });
      }
    };
    void fetchPositions();
    const intervalId = setInterval(() => void fetchPositions(), REFRESH_INTERVAL);
    return () => {
      cancelled = true;
      signal?.removeEventListener('abort', abortRequest);
      controller?.abort();
      clearInterval(intervalId);
    };
  }, [namespace, stableEntries, getPendingWorkloads, signal]);

  return result &&
    result.namespace === namespace &&
    result.entries === stableEntries &&
    result.service === getPendingWorkloads &&
    result.signal === signal &&
    !signal?.aborted
    ? result.metrics
    : EMPTY_METRICS;
};
