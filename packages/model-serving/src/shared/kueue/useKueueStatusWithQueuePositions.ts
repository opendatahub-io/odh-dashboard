import * as React from 'react';
import type { K8sAPIOptions, ProjectKind } from '@odh-dashboard/k8s-core';
import type { KueueWorkloadStatusWithMessage } from '@odh-dashboard/k8s-core/kueue/types';
import { useKueueConfiguration } from '@odh-dashboard/hardware-profiles/shared/kueueUtils';
import type { InferenceServiceKind } from '@odh-dashboard/model-serving/shared';
import {
  useKueueStatusForDeployments,
  type KueueStatusForDeploymentsResult,
} from './useKueueStatusForDeployments';
import { useQueuePositionsForDeployments } from './useQueuePositionsForDeployments';

// Avoids importing @odh-dashboard/llmd-serving/types (not a frontend dep).
type NamedModelResource = { metadata: { name: string; labels?: Record<string, string> } };

/**
 * Kueue status for model deployments with queue position merged from the Visibility API.
 * Mirrors ProjectDetailsContext + useQueuePositions for workbenches.
 */
export const useKueueStatusWithQueuePositions = (
  inferenceServices: InferenceServiceKind[],
  project: ProjectKind | undefined,
  llmInferenceServices: NamedModelResource[] = [],
  opts?: K8sAPIOptions,
): Omit<KueueStatusForDeploymentsResult, 'error'> => {
  const { isKueueFeatureEnabled, isProjectKueueEnabled } = useKueueConfiguration(project);
  const useKueue = Boolean(isKueueFeatureEnabled && isProjectKueueEnabled);
  const namespace = project == null ? undefined : project.metadata.name;

  const {
    kueueStatusByDeploymentKey: rawKueueStatusByDeploymentKey,
    isLoading,
    error,
  } = useKueueStatusForDeployments(inferenceServices, project, llmInferenceServices, opts);

  const queuePositions = useQueuePositionsForDeployments(
    useKueue && !error ? namespace : undefined,
    rawKueueStatusByDeploymentKey,
    opts,
  );

  const kueueStatusByDeploymentKey = React.useMemo(() => {
    if (error) {
      return {};
    }
    if (Object.keys(queuePositions).length === 0) {
      return rawKueueStatusByDeploymentKey;
    }
    const result: Record<string, KueueWorkloadStatusWithMessage | null> = {};
    for (const [deploymentKey, status] of Object.entries(rawKueueStatusByDeploymentKey)) {
      result[deploymentKey] =
        status && deploymentKey in queuePositions
          ? {
              ...status,
              queuePosition: queuePositions[deploymentKey].queuePosition,
              queueTotal: queuePositions[deploymentKey].queueTotal,
            }
          : status;
    }
    return result;
  }, [rawKueueStatusByDeploymentKey, queuePositions, error]);

  return {
    kueueStatusByDeploymentKey,
    isLoading: !error && isLoading,
  };
};
