import * as React from 'react';
import type { InferenceServiceKind } from '@odh-dashboard/model-serving/shared';
import type { ProjectKind } from '@odh-dashboard/k8s-core';
import type { KueueWorkloadStatusWithMessage } from '@odh-dashboard/k8s-core/kueue/types';
import { useKueueConfiguration } from '#~/concepts/hardwareProfiles/kueueUtils';
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
): KueueStatusForDeploymentsResult => {
  const { isKueueFeatureEnabled, isProjectKueueEnabled } = useKueueConfiguration(project);
  const useKueue = Boolean(isKueueFeatureEnabled && isProjectKueueEnabled);
  const namespace = project == null ? undefined : project.metadata.name;

  const {
    kueueStatusByDeploymentKey: rawKueueStatusByDeploymentKey,
    isLoading,
    error,
  } = useKueueStatusForDeployments(inferenceServices, project, llmInferenceServices);

  const queuePositions = useQueuePositionsForDeployments(
    useKueue ? namespace : undefined,
    rawKueueStatusByDeploymentKey,
  );

  const kueueStatusByDeploymentKey = React.useMemo(() => {
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
  }, [rawKueueStatusByDeploymentKey, queuePositions]);

  return {
    kueueStatusByDeploymentKey,
    isLoading,
    error,
  };
};
