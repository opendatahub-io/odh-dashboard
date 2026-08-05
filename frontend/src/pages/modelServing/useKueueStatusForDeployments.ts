import * as React from 'react';
import type { InferenceServiceKind } from '@odh-dashboard/model-serving/shared';
import type { ProjectKind } from '@odh-dashboard/k8s-core';
import { useKueueConfiguration } from '#~/concepts/hardwareProfiles/kueueUtils';
import type { KueueWorkloadStatusWithMessage } from '#~/concepts/kueue/types';
import {
  buildWorkloadMapForDeployments,
  useWatchWorkloads,
  useWatchISPods,
} from '#~/api/k8s/workloads';
import { aggregateKueueStatusForModel, KUEUE_QUEUE_LABEL } from '#~/concepts/kueue/index';

export type KueueStatusForDeploymentsResult = {
  kueueStatusByISName: Record<string, KueueWorkloadStatusWithMessage | null>;
  isLoading: boolean;
  error: string | null;
};

/**
 * Watches Kueue Workload status for InferenceServices in the project.
 *
 * Correlation uses the confirmed two-hop path from a live RHOAI cluster with RHBoK:
 *   Workload CR ownerRef → Pod (by UID) → Pod label serving.kserve.io/inferenceservice → IS name
 *
 * For multi-replica IS the most-restrictive Kueue state across all per-Pod Workload CRs is shown.
 * Only runs when Kueue is enabled for the project. Mirrors useKueueStatusForNotebooks.
 */
export const useKueueStatusForDeployments = (
  inferenceServices: InferenceServiceKind[],
  project: ProjectKind | undefined,
): KueueStatusForDeploymentsResult => {
  const { isKueueFeatureEnabled, isProjectKueueEnabled } = useKueueConfiguration(project);
  const useKueue = Boolean(isKueueFeatureEnabled && isProjectKueueEnabled);
  const namespace = project == null ? undefined : project.metadata.name;

  const [workloads, workloadsLoaded, watchError] = useWatchWorkloads(
    useKueue ? namespace : undefined,
  );
  const [pods, podsLoaded] = useWatchISPods(useKueue ? namespace : undefined);

  const kueueStatusByISName = React.useMemo(() => {
    if (!useKueue) {
      return {};
    }
    const workloadMap = buildWorkloadMapForDeployments(workloads, pods, inferenceServices);
    const isByName = new Map(
      inferenceServices
        .filter((is): is is typeof is & { metadata: { name: string } } => Boolean(is.metadata.name))
        .map((is) => [is.metadata.name, is]),
    );
    const statusMap: Record<string, KueueWorkloadStatusWithMessage | null> = {};
    for (const [name, isWorkloads] of Object.entries(workloadMap)) {
      const aggregated = aggregateKueueStatusForModel(isWorkloads);
      if (!aggregated) {
        statusMap[name] = null;
        continue;
      }
      const is = isByName.get(name);
      statusMap[name] = {
        ...aggregated,
        queueName: is?.metadata.labels?.[KUEUE_QUEUE_LABEL],
        workloadName: isWorkloads[0]?.metadata?.name,
      };
    }
    return statusMap;
  }, [useKueue, workloads, pods, inferenceServices]);

  return {
    kueueStatusByISName,
    isLoading: useKueue && (!workloadsLoaded || !podsLoaded),
    error: useKueue && watchError ? watchError.message : null,
  };
};
