import { k8sListResourceItems } from '@openshift/dynamic-plugin-sdk-utils';
import type { PodKind } from '@odh-dashboard/k8s-core';
import type { InferenceServiceKind } from '@odh-dashboard/model-serving/shared';
import { NotebookKind, WorkloadKind } from '#~/k8sTypes';
import { WorkloadModel } from '#~/api/models/kueue';
import { PodModel } from '#~/api/models';
import { groupVersionKind } from '#~/api/k8sUtils';
import { CustomWatchK8sResult } from '#~/types';
import useK8sWatchResourceList from '#~/utilities/useK8sWatchResourceList';

export const listWorkloads = async (
  namespace?: string,
  labelSelector?: string,
): Promise<WorkloadKind[]> => {
  const queryOptions = {
    ns: namespace,
    ...(labelSelector && { queryParams: { labelSelector } }),
  };
  return k8sListResourceItems<WorkloadKind>({
    model: WorkloadModel,
    queryOptions,
  });
};

const isStatefulSetPodName = (ownerName: string, notebookName: string): boolean => {
  if (ownerName === notebookName) return true;
  const prefix = `${notebookName}-`;
  if (!ownerName.startsWith(prefix)) return false;
  const suffix = ownerName.slice(prefix.length);
  return suffix.length > 0 && /^\d+$/.test(suffix);
};

const workloadMatchesNotebook = (wl: WorkloadKind, notebookName: string): boolean => {
  const owners = wl.metadata?.ownerReferences ?? [];
  for (const ref of owners) {
    const ownerKind = ref.kind.toLowerCase();
    if ((ownerKind === 'job' || ownerKind === 'notebook') && ref.name === notebookName) return true;
    if (ownerKind === 'statefulset' && isStatefulSetPodName(ref.name, notebookName)) return true;
    if (ownerKind === 'pod' && isStatefulSetPodName(ref.name, notebookName)) return true;
  }
  return false;
};

/**
 * Build a map of notebook name -> Workload (or null) from an in-memory list of workloads.
 * Uses job-name label first, then ownerRef matching (Job, StatefulSet, Notebook, Pod).
 */
export const buildWorkloadMapForNotebooks = (
  workloads: WorkloadKind[],
  notebooks: NotebookKind[],
): Record<string, WorkloadKind | null> => {
  const result: Record<string, WorkloadKind | null> = {};
  for (const notebook of notebooks) {
    const notebookName = notebook.metadata.name;
    if (!notebookName) {
      result[notebookName] = null;
      continue;
    }
    const byJobName = workloads.find(
      (wl) => wl.metadata?.labels?.['kueue.x-k8s.io/job-name'] === notebookName,
    );
    const matchedWorkload =
      byJobName ?? workloads.find((wl) => workloadMatchesNotebook(wl, notebookName)) ?? null;
    result[notebookName] = matchedWorkload;
  }
  return result;
};

// Minimal structural type for a named model deployment.
// Avoids importing @odh-dashboard/llmd-serving/types which is not a frontend dep.
type NamedModelResource = { metadata: { name: string } };

/**
 * Two-hop Workload-to-IS/LLMIS correlation (confirmed on live RHOAI + RHBoK cluster):
 * Workload CR ownerRef (kind: Pod) → Pod lookup by UID → Pod label → model name.
 *
 * InferenceService pods carry: `serving.kserve.io/inferenceservice` = IS name
 * LLMInferenceService pods carry: `app.kubernetes.io/component = llminferenceservice-workload`
 *   (discriminator) and `app.kubernetes.io/name` = LLMIS name.
 *
 * Returns model name → WorkloadKind[] (1:many when replicas > 1).
 * Workloads whose Pod UID is not in pods (orphaned) are silently skipped.
 */
export const buildWorkloadMapForDeployments = (
  workloads: WorkloadKind[],
  pods: PodKind[],
  inferenceServices: InferenceServiceKind[],
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
      result[is.metadata.name] = [];
    }
  }
  for (const llmis of llmInferenceServices) {
    result[llmis.metadata.name] = [];
  }

  for (const wl of workloads) {
    // Find the ownerRef that points to a Pod (Plain Pod integration).
    const podRef = (wl.metadata?.ownerReferences ?? []).find(
      (ref) => ref.kind.toLowerCase() === 'pod',
    );
    if (!podRef) continue;

    const pod = podByUID.get(podRef.uid);
    if (!pod) continue; // Pod gone (scale-down, rolling update) — skip orphaned Workload.

    const labels = pod.metadata.labels ?? {};

    // IS: serving.kserve.io/inferenceservice. LLMIS: component=llminferenceservice-workload + name.
    const modelName =
      labels['serving.kserve.io/inferenceservice'] ??
      (labels['app.kubernetes.io/component'] === 'llminferenceservice-workload'
        ? labels['app.kubernetes.io/name']
        : undefined);

    if (!modelName) continue; // Not a model serving Pod.

    if (Object.prototype.hasOwnProperty.call(result, modelName)) {
      result[modelName].push(wl);
    }
  }

  return result;
};

/**
 * Watch IS-labeled Pods in a namespace (serving.kserve.io/inferenceservice: Exists).
 * Used as the InferenceService Pod source for two-hop Workload-to-IS correlation.
 * Pass undefined namespace to disable the watch.
 */
export const useWatchISPods = (namespace: string | undefined): CustomWatchK8sResult<PodKind[]> =>
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
  );

/**
 * Watch LLMIS-labeled Pods in a namespace
 * (app.kubernetes.io/component = llminferenceservice-workload).
 * Used as the LLMInferenceService Pod source for two-hop Workload-to-LLMIS correlation.
 * Pass undefined namespace to disable the watch.
 */
export const useWatchLLMISPods = (namespace: string | undefined): CustomWatchK8sResult<PodKind[]> =>
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
  );

/**
 * Watch Kueue Workloads in a namespace. Updates from the API watch stream (no polling).
 * Pass undefined to disable the watch.
 */
export const useWatchWorkloads = (
  namespace: string | undefined,
): CustomWatchK8sResult<WorkloadKind[]> =>
  useK8sWatchResourceList(
    namespace
      ? {
          isList: true,
          groupVersionKind: groupVersionKind(WorkloadModel),
          namespace,
        }
      : null,
    WorkloadModel,
  );
