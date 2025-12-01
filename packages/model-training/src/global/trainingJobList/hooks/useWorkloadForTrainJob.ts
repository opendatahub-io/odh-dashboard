import * as React from 'react';
import { WorkloadKind } from '@odh-dashboard/internal/k8sTypes';
import { WorkloadModel } from '@odh-dashboard/internal/api/models/kueue';
import { groupVersionKind } from '@odh-dashboard/internal/api/k8sUtils';
import useK8sWatchResourceList from '@odh-dashboard/internal/utilities/useK8sWatchResourceList';
import { CustomWatchK8sResult } from '@odh-dashboard/internal/types';
import { TrainJobKind } from '../../../k8sTypes';

export const useWorkloadForTrainJob = (
  job: TrainJobKind | null,
): CustomWatchK8sResult<WorkloadKind[]> => {
  const selector = React.useMemo(() => {
    if (!job) return undefined;
    // Try UID first (most reliable)
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

export const useWorkload = (job: TrainJobKind | null): WorkloadKind | null => {
  const [workloads, loaded] = useWorkloadForTrainJob(job);
  return React.useMemo(() => {
    if (!loaded || workloads.length === 0) return null;
    return workloads[0];
  }, [workloads, loaded]);
};
