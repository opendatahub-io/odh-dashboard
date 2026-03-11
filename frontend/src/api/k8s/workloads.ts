import { k8sListResourceItems } from '@openshift/dynamic-plugin-sdk-utils';
import { NotebookKind, WorkloadKind } from '#~/k8sTypes';
import { WorkloadModel } from '#~/api/models/kueue';
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
  const suffix = ownerName.slice(notebookName.length);
  return suffix.length > 1 && suffix[0] === '-' && /^\d+$/.test(suffix.slice(1));
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
