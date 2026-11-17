import { k8sListResourceItems } from '@openshift/dynamic-plugin-sdk-utils';
import { WorkloadModel } from '@odh-dashboard/k8s-core/api/models';
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
 * itself another known notebook—preventing `test-workbench-2` from matching `test-workbench`.
 *
 * For Pod ownerRefs, the replica suffix of THIS notebook always takes priority: a Pod named
 * `parent-0` belongs to notebook `parent` even when a separate notebook `parent-0` exists
 * (RHOAIENG-96121).
 */
const isStatefulSetPodName = (
  ownerName: string,
  notebookName: string,
  knownNotebookNames: ReadonlySet<string>,
  ownerKind: string,
): boolean => {
  if (ownerName === notebookName) {
    // Pod ownerRefs: if ownerName matches `<other-notebook>-<n>` where the other notebook
    // exists, the Pod is a replica of that parent StatefulSet — reject this exact match so
    // the parent notebook claims the Workload instead.
    if (ownerKind === 'pod') {
      const lastDash = ownerName.lastIndexOf('-');
      if (lastDash > 0) {
        const possibleParent = ownerName.slice(0, lastDash);
        const suffix = ownerName.slice(lastDash + 1);
        if (suffix.length > 0 && /^\d+$/.test(suffix) && knownNotebookNames.has(possibleParent)) {
          return false;
        }
      }
    }
    return true;
  }

  const prefix = `${notebookName}-`;
  if (!ownerName.startsWith(prefix)) return false;
  const suffix = ownerName.slice(prefix.length);
  if (suffix.length === 0 || !/^\d+$/.test(suffix)) return false;

  // ownerName is `<notebookName>-<n>`.
  // Pod ownerRefs: the Pod IS the replica of this notebook's StatefulSet — always match.
  if (ownerKind === 'pod') return true;

  // StatefulSet ownerRefs: if ownerName is another Workbench, the StatefulSet belongs to
  // that workbench, not to this one. Only fall back to suffix matching when no such
  // workbench exists.
  return !knownNotebookNames.has(ownerName);
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
    if (ownerKind === 'statefulset' || ownerKind === 'pod') {
      if (isStatefulSetPodName(ref.name, notebookName, knownNotebookNames, ownerKind)) {
        return true;
      }
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
