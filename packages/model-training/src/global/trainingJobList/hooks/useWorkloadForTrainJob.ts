import * as React from 'react';
import { WorkloadKind } from '@odh-dashboard/k8s-core';
import { WorkloadModel } from '@odh-dashboard/k8s-core/api/models';
import { groupVersionKind } from '@odh-dashboard/k8s-core/api/k8sUtils';
import useK8sWatchResourceList from '@odh-dashboard/ui-core/hooks/useK8sWatchResourceList';
import { CustomWatchK8sResult } from '@odh-dashboard/internal/types';
import { TrainJobKind } from '../../../k8sTypes';
import { UnifiedJobKind } from '../../../types';

/**
 * Generic hook: watch the Kueue Workload for any job type (TrainJob or RayJob).
 * Kueue labels every workload with kueue.x-k8s.io/job-uid (preferred) or
 * kueue.x-k8s.io/job-name (fallback). Non-Kueue jobs return an empty list.
 */
export const useWorkloadForJob = (
  job: UnifiedJobKind | null,
): CustomWatchK8sResult<WorkloadKind[]> => {
  const selector = React.useMemo(() => {
    if (!job) return undefined;
    if (job.metadata.uid) {
      const matchLabels: Record<string, string> = { 'kueue.x-k8s.io/job-uid': job.metadata.uid };
      return { matchLabels };
    }
    const matchLabels: Record<string, string> = { 'kueue.x-k8s.io/job-name': job.metadata.name };
    return { matchLabels };
  }, [job]);

  return useK8sWatchResourceList(
    {
      isList: true,
      groupVersionKind: groupVersionKind(WorkloadModel),
      namespace: job?.metadata.namespace,
      ...(selector && { selector }),
    },
    WorkloadModel,
  );
};

/**
 * TrainJob-specific hook: watches ALL Workloads in the namespace and filters
 * client-side.  The Training Operator creates a JobSet with the same name as
 * the TrainJob, and Kueue labels the Workload with the JobSet UID — not the
 * TrainJob UID.  A label-selector watch by TrainJob UID therefore misses it.
 *
 * Matching rules:
 *  1. kueue.x-k8s.io/job-uid === TrainJob UID  (requires defined UID)
 *  2. ownerReferences contains a JobSet whose name === TrainJob name
 *
 * Results are sorted by creationTimestamp descending so consumers selecting
 * workloads[0] get the most recent (stable) result.
 */
export const useWorkloadForTrainJob = (
  job: TrainJobKind | null,
): CustomWatchK8sResult<WorkloadKind[]> => {
  const [allWorkloads, loaded, error] = useK8sWatchResourceList(
    job
      ? {
          isList: true,
          groupVersionKind: groupVersionKind(WorkloadModel),
          namespace: job.metadata.namespace,
        }
      : null,
    WorkloadModel,
  );

  const matchingWorkloads = React.useMemo((): WorkloadKind[] => {
    if (!job || !loaded) return [];
    const jobUid = job.metadata.uid;
    const jobName = job.metadata.name;
    return allWorkloads
      .filter((w): w is WorkloadKind => {
        const labels = w.metadata?.labels ?? {};
        // Direct UID match — only when the TrainJob UID is defined
        if (jobUid && labels['kueue.x-k8s.io/job-uid'] === jobUid) return true;
        // JobSet owner reference match — the JobSet has the same name as the TrainJob
        const owners = w.metadata?.ownerReferences ?? [];
        return owners.some((o) => o.kind === 'JobSet' && o.name === jobName);
      })
      .toSorted((a, b) => {
        const tsA = a.metadata?.creationTimestamp ?? '';
        const tsB = b.metadata?.creationTimestamp ?? '';
        return tsB.localeCompare(tsA); // newest first
      });
  }, [allWorkloads, job, loaded]);

  return [matchingWorkloads, loaded, error];
};

export const useWorkload = (job: UnifiedJobKind | null): WorkloadKind | null => {
  const [workloads, loaded] = useWorkloadForJob(job);
  return React.useMemo(() => {
    if (!loaded || workloads.length === 0) return null;
    return workloads[0];
  }, [workloads, loaded]);
};
