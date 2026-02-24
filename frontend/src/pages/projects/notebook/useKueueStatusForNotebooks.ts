import * as React from 'react';
import { ProjectKind } from '#~/k8sTypes';
import { useKueueConfiguration } from '#~/concepts/hardwareProfiles/kueueUtils';
import type { KueueWorkloadStatusWithMessage } from '#~/concepts/kueue/types';
import { buildWorkloadMapForNotebooks, useWatchWorkloads } from '#~/api/k8s/workloads';
import { getKueueWorkloadStatusWithMessage } from '#~/concepts/kueue/index';
import { NotebookState } from './types';

export type KueueStatusForNotebooksResult = {
  kueueStatusByNotebookName: Record<string, KueueWorkloadStatusWithMessage | null>;
  isLoading: boolean;
  error: string | null;
};

/**
 * Watches Kueue Workload status for notebooks in the project via the API watch stream.
 * Only runs when Kueue is enabled for the project. Used by ProjectDetailsContext to
 * provide batch Kueue status to the table and modals (no polling).
 */
export const useKueueStatusForNotebooks = (
  notebookStates: NotebookState[] | undefined,
  project: ProjectKind | undefined,
): KueueStatusForNotebooksResult => {
  const { isKueueFeatureEnabled, isProjectKueueEnabled } = useKueueConfiguration(project);
  const useKueue = Boolean(isKueueFeatureEnabled && isProjectKueueEnabled);
  const namespace = project == null ? undefined : project.metadata.name;
  const notebooks = React.useMemo(
    () => notebookStates?.map((s) => s.notebook) ?? [],
    [notebookStates],
  );

  const [workloads, loaded, watchError] = useWatchWorkloads(useKueue ? namespace : undefined);

  const kueueStatusByNotebookName = React.useMemo(() => {
    if (!useKueue) return {};
    const workloadMap = buildWorkloadMapForNotebooks(workloads, notebooks);
    const statusMap: Record<string, KueueWorkloadStatusWithMessage | null> = {};
    for (const [name, workload] of Object.entries(workloadMap)) {
      statusMap[name] = workload ? getKueueWorkloadStatusWithMessage(workload) : null;
    }
    return statusMap;
  }, [useKueue, workloads, notebooks]);

  return {
    kueueStatusByNotebookName,
    isLoading: useKueue && !loaded,
    error: useKueue && watchError ? watchError.message : null,
  };
};
