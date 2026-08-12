import * as React from 'react';
import type { InferenceServiceKind } from '@odh-dashboard/model-serving/shared';
import type { ProjectKind } from '@odh-dashboard/k8s-core';
import { useKueueConfiguration } from '#~/concepts/hardwareProfiles/kueueUtils';
import type { KueueWorkloadStatusWithMessage } from '#~/concepts/kueue/types';
import {
  buildModelDeploymentKey,
  buildWorkloadMapForDeployments,
  useWatchWorkloads,
  useWatchISPods,
  useWatchLLMISPods,
} from '#~/api/k8s/workloads';
import { aggregateKueueStatusForModel, KUEUE_QUEUE_LABEL } from '#~/concepts/kueue/index';

// Avoids importing @odh-dashboard/llmd-serving/types (not a frontend dep).
type NamedModelResource = { metadata: { name: string } };

export type KueueStatusForDeploymentsResult = {
  /** Keys are `buildModelDeploymentKey(kind, name)` e.g. `InferenceService/foo`. */
  kueueStatusByDeploymentKey: Record<string, KueueWorkloadStatusWithMessage | null>;
  isLoading: boolean;
  error: string | null;
};

/**
 * Watches Kueue Workload status for InferenceServices (and optionally LLMInferenceServices)
 * in the project.
 *
 * Correlation uses the confirmed two-hop path from a live RHOAI cluster with RHBoK:
 *   IS:    Workload ownerRef → Pod (by UID) → Pod label `serving.kserve.io/inferenceservice`
 *   LLMIS: Workload ownerRef → Pod (by UID) → Pod label `app.kubernetes.io/name`
 *          (filtered by `app.kubernetes.io/component = llminferenceservice-workload`)
 *
 * Status map keys are typed (`InferenceService/name`, `LLMInferenceService/name`) so same-name
 * IS and LLMIS in one namespace stay independent.
 *
 * For multi-replica models the most-restrictive Kueue state across all per-Pod Workload CRs
 * is shown. Only runs when Kueue is enabled for the project.
 */
export const useKueueStatusForDeployments = (
  inferenceServices: InferenceServiceKind[],
  project: ProjectKind | undefined,
  llmInferenceServices: NamedModelResource[] = [],
): KueueStatusForDeploymentsResult => {
  const { isKueueFeatureEnabled, isProjectKueueEnabled } = useKueueConfiguration(project);
  const useKueue = Boolean(isKueueFeatureEnabled && isProjectKueueEnabled);
  const namespace = project == null ? undefined : project.metadata.name;

  const [workloads, workloadsLoaded, watchError] = useWatchWorkloads(
    useKueue ? namespace : undefined,
  );
  const [isPods, isPodsLoaded, isPodsWatchError] = useWatchISPods(useKueue ? namespace : undefined);
  const [llmisPods, llmisPodsLoaded, llmisPodsWatchError] = useWatchLLMISPods(
    useKueue ? namespace : undefined,
  );

  const kueueStatusByDeploymentKey = React.useMemo(() => {
    if (!useKueue) {
      return {};
    }
    const allPods = [...isPods, ...llmisPods];
    const workloadMap = buildWorkloadMapForDeployments(
      workloads,
      allPods,
      inferenceServices,
      llmInferenceServices,
    );
    const isByKey = new Map(
      inferenceServices
        .filter((is): is is typeof is & { metadata: { name: string } } => Boolean(is.metadata.name))
        .map((is) => [buildModelDeploymentKey('InferenceService', is.metadata.name), is]),
    );
    const statusMap: Record<string, KueueWorkloadStatusWithMessage | null> = {};
    for (const [deploymentKey, isWorkloads] of Object.entries(workloadMap)) {
      const aggregated = aggregateKueueStatusForModel(isWorkloads);
      if (!aggregated) {
        statusMap[deploymentKey] = null;
        continue;
      }
      const is = isByKey.get(deploymentKey);
      statusMap[deploymentKey] = {
        ...aggregated, // includes workloadName from the winning Workload
        queueName: is?.metadata.labels?.[KUEUE_QUEUE_LABEL],
      };
    }
    return statusMap;
  }, [useKueue, workloads, isPods, llmisPods, inferenceServices, llmInferenceServices]);

  return {
    kueueStatusByDeploymentKey,
    isLoading: useKueue && (!workloadsLoaded || !isPodsLoaded || !llmisPodsLoaded),
    error: useKueue
      ? (watchError ?? isPodsWatchError ?? llmisPodsWatchError)?.message ?? null
      : null,
  };
};
