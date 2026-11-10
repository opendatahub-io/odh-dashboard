import { k8sListResourceItems } from '@openshift/dynamic-plugin-sdk-utils';
import type { K8sAPIOptions, K8sWatchResult, PodKind, WorkloadKind } from '@odh-dashboard/k8s-core';
import { WorkloadModel, PodModel } from '@odh-dashboard/k8s-core/api/models';
import { groupVersionKind } from '@odh-dashboard/k8s-core/api/k8sUtils';
import {
  aggregateKueueStatusForModel,
  KUEUE_QUEUE_LABEL,
} from '@odh-dashboard/k8s-core/kueue/workloadStatus';
import type { KueueWorkloadStatusWithMessage } from '@odh-dashboard/k8s-core/kueue/types';
import useK8sWatchResourceList from '@odh-dashboard/ui-core/hooks/useK8sWatchResourceList';
import type { InferenceServiceKind } from '../types';
import { buildModelDeploymentKey } from '../utils/deploymentKey';

// Avoids importing @odh-dashboard/llmd-serving/types which is not a frontend dep.
export type NamedModelResource = { metadata: { name: string } };

/**
 * Two-hop Workload-to-IS/LLMIS correlation (confirmed on live RHOAI + RHBoK cluster):
 * Workload CR ownerRef (kind: Pod) → Pod lookup by UID → Pod label → typed deployment key.
 *
 * InferenceService pods carry: `serving.kserve.io/inferenceservice` = IS name
 * LLMInferenceService pods carry: `app.kubernetes.io/component = llminferenceservice-workload`
 *   (discriminator) and `app.kubernetes.io/name` = LLMIS name.
 *
 * Returns `kind/name` → WorkloadKind[] (1:many when replicas > 1).
 * Workloads whose Pod UID is not in pods (orphaned) are silently skipped.
 */
export const buildWorkloadMapForDeployments = (
  workloads: WorkloadKind[],
  pods: PodKind[],
  inferenceServices: NamedModelResource[],
  llmInferenceServices: NamedModelResource[] = [],
): Record<string, WorkloadKind[]> => {
  // Prime a UID → Pod lookup for O(1) resolution of ownerRef UIDs.
  const podByUID = new Map<string, PodKind>(
    pods.flatMap((p) => (p.metadata.uid != null ? [[p.metadata.uid, p]] : [])),
  );

  // Seed every known IS and LLMIS with an empty array so callers can distinguish
  // "model exists but no workload yet" from "model not in result at all".
  const result: Record<string, WorkloadKind[]> = {};
  for (const is of inferenceServices) {
    if (is.metadata.name) {
      result[buildModelDeploymentKey('InferenceService', is.metadata.name)] = [];
    }
  }
  for (const llmis of llmInferenceServices) {
    result[buildModelDeploymentKey('LLMInferenceService', llmis.metadata.name)] = [];
  }

  for (const wl of workloads) {
    // Find the ownerRef that points to a Pod (Plain Pod integration).
    const podRef = (wl.metadata?.ownerReferences ?? []).find(
      (ref) => ref.kind.toLowerCase() === 'pod',
    );
    if (!podRef) continue;

    const pod = podByUID.get(podRef.uid);
    if (!pod) continue; // Pod gone (scale-down, rolling update) — skip orphaned Workload.

    if (pod.status?.phase === 'Succeeded' || pod.status?.phase === 'Failed') continue;

    const labels = pod.metadata.labels ?? {};

    // IS: serving.kserve.io/inferenceservice. LLMIS: component=llminferenceservice-workload + name.
    const isName = labels['serving.kserve.io/inferenceservice'];
    let deploymentKey: string | undefined;
    if (isName) {
      deploymentKey = buildModelDeploymentKey('InferenceService', isName);
    } else if (labels['app.kubernetes.io/component'] === 'llminferenceservice-workload') {
      const llmisName = labels['app.kubernetes.io/name'];
      if (llmisName) {
        deploymentKey = buildModelDeploymentKey('LLMInferenceService', llmisName);
      }
    }

    if (!deploymentKey) continue; // Not a model serving Pod.

    if (Object.prototype.hasOwnProperty.call(result, deploymentKey)) {
      result[deploymentKey].push(wl);
    }
  }

  return result;
};

/** Live (non-terminal) model-serving Pods for a typed deployment key. */
export const countActiveModelDeploymentPods = (deploymentKey: string, pods: PodKind[]): number => {
  const isTerminal = (phase?: string): boolean => phase === 'Succeeded' || phase === 'Failed';

  if (deploymentKey.startsWith('InferenceService/')) {
    const name = deploymentKey.slice('InferenceService/'.length);
    return pods.filter((pod) => {
      const labels = pod.metadata.labels ?? {};
      return (
        labels['serving.kserve.io/inferenceservice'] === name && !isTerminal(pod.status?.phase)
      );
    }).length;
  }

  if (deploymentKey.startsWith('LLMInferenceService/')) {
    const name = deploymentKey.slice('LLMInferenceService/'.length);
    return pods.filter((pod) => {
      const labels = pod.metadata.labels ?? {};
      return (
        labels['app.kubernetes.io/name'] === name &&
        labels['app.kubernetes.io/component'] === 'llminferenceservice-workload' &&
        !isTerminal(pod.status?.phase)
      );
    }).length;
  }

  return 0;
};

/**
 * One-shot Kueue status for a single InferenceService (used by KServe fetchDeploymentStatus poll).
 * Mirrors the aggregation in useKueueStatusForDeployments without a watch subscription.
 */
export const resolveKueueStatusForInferenceService = async (
  inferenceService: InferenceServiceKind,
  pods: PodKind[],
): Promise<KueueWorkloadStatusWithMessage | null> => {
  const { namespace, name } = inferenceService.metadata;
  if (!namespace || !name) {
    return null;
  }

  try {
    const workloads = await k8sListResourceItems<WorkloadKind>({
      model: WorkloadModel,
      queryOptions: { ns: namespace },
    });
    const deploymentKey = buildModelDeploymentKey('InferenceService', name);
    const workloadMap = buildWorkloadMapForDeployments(workloads, pods, [inferenceService]);
    const isWorkloads = workloadMap[deploymentKey] ?? [];
    const aggregated = aggregateKueueStatusForModel(isWorkloads, {
      activePodCount: countActiveModelDeploymentPods(deploymentKey, pods),
    });
    if (!aggregated) {
      return null;
    }
    return {
      ...aggregated,
      queueName: inferenceService.metadata.labels?.[KUEUE_QUEUE_LABEL],
    };
  } catch {
    // RBAC denial or missing CRD — fall back to KServe-only status on the poll path.
    return null;
  }
};

/**
 * Watch IS-labeled Pods in a namespace (serving.kserve.io/inferenceservice: Exists).
 * Used as the InferenceService Pod source for two-hop Workload-to-IS correlation.
 * Pass undefined namespace to disable the watch.
 */
export const useWatchISPods = (
  namespace: string | undefined,
  opts?: K8sAPIOptions,
): K8sWatchResult<PodKind[]> =>
  useK8sWatchResourceList(
    namespace
      ? {
          isList: true,
          groupVersionKind: groupVersionKind(PodModel),
          namespace,
          selector: {
            matchExpressions: [{ key: 'serving.kserve.io/inferenceservice', operator: 'Exists' }],
          },
        }
      : null,
    PodModel,
    opts,
  );

/**
 * Watch LLMIS-labeled Pods in a namespace
 * (app.kubernetes.io/component = llminferenceservice-workload).
 * Used as the LLMInferenceService Pod source for two-hop Workload-to-LLMIS correlation.
 * Pass undefined namespace to disable the watch.
 */
export const useWatchLLMISPods = (
  namespace: string | undefined,
  opts?: K8sAPIOptions,
): K8sWatchResult<PodKind[]> =>
  useK8sWatchResourceList(
    namespace
      ? {
          isList: true,
          groupVersionKind: groupVersionKind(PodModel),
          namespace,
          selector: {
            matchExpressions: [
              {
                key: 'app.kubernetes.io/component',
                operator: 'In',
                values: ['llminferenceservice-workload'],
              },
            ],
          },
        }
      : null,
    PodModel,
    opts,
  );

/**
 * Watch Kueue Workloads in a namespace. Updates from the API watch stream (no polling).
 * Pass undefined to disable the watch.
 */
export const useWatchWorkloads = (
  namespace: string | undefined,
  opts?: K8sAPIOptions,
): K8sWatchResult<WorkloadKind[]> =>
  useK8sWatchResourceList(
    namespace
      ? {
          isList: true,
          groupVersionKind: groupVersionKind(WorkloadModel),
          namespace,
        }
      : null,
    WorkloadModel,
    opts,
  );
