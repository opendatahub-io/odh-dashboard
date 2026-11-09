import { k8sListResourceItems } from '@openshift/dynamic-plugin-sdk-utils';
import type { PodKind } from '@odh-dashboard/k8s-core';
import type { InferenceServiceKind } from '@odh-dashboard/model-serving/shared';
import { buildModelDeploymentKey } from '@odh-dashboard/model-serving/shared/utils/deploymentKey';
import { WorkloadModel, PodModel } from '@odh-dashboard/k8s-core/api/models';
import {
  aggregateKueueStatusForModel,
  KUEUE_QUEUE_LABEL,
} from '@odh-dashboard/k8s-core/kueue/workloadStatus';
import type { KueueWorkloadStatusWithMessage } from '@odh-dashboard/k8s-core/kueue/types';
import { groupVersionKind } from '@odh-dashboard/k8s-core/api/k8sUtils';
import useK8sWatchResourceList from '@odh-dashboard/ui-core/hooks/useK8sWatchResourceList';
import { NotebookKind, WorkloadKind } from '#~/k8sTypes';

import { CustomWatchK8sResult } from '#~/types';

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

const KUEUE_JOB_NAME_LABEL = 'kueue.x-k8s.io/job-name';
const KUEUE_JOB_OWNER_NAME_ANNOTATION = 'kueue.x-k8s.io/job-owner-name';
const KUEUE_JOB_OWNER_GVK_ANNOTATION = 'kueue.x-k8s.io/job-owner-gvk';

/**
 * Extracts the `Kind` segment from a Kueue `job-owner-gvk` value
 * (e.g., "apps/v1, Kind=StatefulSet").
 * */
const parseKueueJobOwnerKind = (ownerGvk: string): string | undefined =>
  ownerGvk.match(/Kind=([^,\s]+)/i)?.[1];

/**
 * Resolves the name of the owning StatefulSet declared via Kueue annotations. Workbench workloads
 * based on StatefulSets may omit `ownerReferences` and instead include the
 * `kueue.x-k8s.io/job-owner-name` and `job-owner-gvk` annotations. It only returns a name when the
 * GVK annotation confirms that the owner is a StatefulSet.
 */
const findStatefulSetOwnerNameFromAnnotations = (wl: WorkloadKind): string | undefined => {
  const ownerName = wl.metadata?.annotations?.[KUEUE_JOB_OWNER_NAME_ANNOTATION]?.trim();
  const ownerGvk = wl.metadata?.annotations?.[KUEUE_JOB_OWNER_GVK_ANNOTATION];
  if (!ownerName || !ownerGvk) return undefined;
  if (parseKueueJobOwnerKind(ownerGvk)?.toLowerCase() !== 'statefulset') return undefined;
  return ownerName;
};

/**
 * Matches the name of a StatefulSet/Pod `ownerRef` to a notebook. The numeric replica suffix
 * (`<notebook>-<n>`) is only respected as a fallback; it is ignored when `ownerName` is
 * itself another known notebook—preventing `test-workbench-2` from matching `test-workbench`
 * (RHOAIENG-96121).
 */
const isStatefulSetPodName = (
  ownerName: string,
  notebookName: string,
  knownNotebookNames: ReadonlySet<string>,
): boolean => {
  if (ownerName === notebookName) return true;
  // The ownerName belongs to another Workbench — never treat it as a replica suffix.
  if (knownNotebookNames.has(ownerName)) return false;
  const prefix = `${notebookName}-`;
  if (!ownerName.startsWith(prefix)) return false;
  const suffix = ownerName.slice(prefix.length);
  return suffix.length > 0 && /^\d+$/.test(suffix);
};

const workloadMatchesNotebook = (
  wl: WorkloadKind,
  notebookName: string,
  knownNotebookNames: ReadonlySet<string>,
): boolean => {
  const owners = wl.metadata?.ownerReferences ?? [];
  for (const ref of owners) {
    const ownerKind = ref.kind.toLowerCase();
    if ((ownerKind === 'job' || ownerKind === 'notebook') && ref.name === notebookName) return true;
    if (
      (ownerKind === 'statefulset' || ownerKind === 'pod') &&
      isStatefulSetPodName(ref.name, notebookName, knownNotebookNames)
    ) {
      return true;
    }
  }
  return false;
};

/**
 * Build a map of notebook name -> Workload (or null) from an in-memory list of workloads.
 * Resolution order (RHOAIENG-96121):
 *   1. Label `kueue.x-k8s.io/job-name` (exact match).
 *   2. Annotation `kueue.x-k8s.io/job-owner-name`, validated as a StatefulSet (exact match).
 *   3. Matching via ownerRef (Job, Notebook, StatefulSet, Pod); the fallback for StatefulSet/Pod
 *      numeric suffixes is ignored when it would collide with another Workbench name.
 */
export const buildWorkloadMapForNotebooks = (
  workloads: WorkloadKind[],
  notebooks: NotebookKind[],
): Record<string, WorkloadKind | null> => {
  const result: Record<string, WorkloadKind | null> = {};
  const knownNotebookNames = new Set(
    notebooks
      .map((notebook) => notebook.metadata.name)
      .filter((name): name is string => Boolean(name)),
  );
  for (const notebook of notebooks) {
    const notebookName = notebook.metadata.name;
    if (!notebookName) {
      result[notebookName] = null;
      continue;
    }
    const matchedWorkload =
      workloads.find((wl) => wl.metadata?.labels?.[KUEUE_JOB_NAME_LABEL] === notebookName) ??
      workloads.find((wl) => findStatefulSetOwnerNameFromAnnotations(wl) === notebookName) ??
      workloads.find((wl) => workloadMatchesNotebook(wl, notebookName, knownNotebookNames)) ??
      null;
    result[notebookName] = matchedWorkload;
  }
  return result;
};

// Avoids importing @odh-dashboard/llmd-serving/types which is not a frontend dep.
type NamedModelResource = { metadata: { name: string } };

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
    const workloads = await listWorkloads(namespace);
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
