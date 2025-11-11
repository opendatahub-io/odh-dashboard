import {
  k8sDeleteResource,
  K8sStatus,
  k8sPatchResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { applyK8sAPIOptions } from '@odh-dashboard/internal/api/apiMergeUtils';
import { K8sAPIOptions, WorkloadKind } from '@odh-dashboard/internal/k8sTypes';
import { listWorkloads } from '@odh-dashboard/internal/api/k8s/workloads';
import { WorkloadModel } from '@odh-dashboard/internal/api/models/kueue';
import { groupVersionKind } from '@odh-dashboard/internal/api/k8sUtils';
import { CustomWatchK8sResult } from '@odh-dashboard/internal/types';
import useK8sWatchResourceList from '@odh-dashboard/internal/utilities/useK8sWatchResourceList';
import { TrainJobModel } from '@odh-dashboard/internal/api/models/kubeflow';
import { TrainJobKind } from './k8sTypes';

export const useTrainJobs = (namespace: string): CustomWatchK8sResult<TrainJobKind[]> =>
  useK8sWatchResourceList(
    {
      isList: true,
      groupVersionKind: groupVersionKind(TrainJobModel),
      namespace,
    },
    TrainJobModel,
  );

export const deleteTrainJob = (
  name: string,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<K8sStatus> =>
  k8sDeleteResource<TrainJobKind, K8sStatus>(
    applyK8sAPIOptions(
      {
        model: TrainJobModel,
        queryOptions: { name, ns: namespace },
      },
      opts,
    ),
  );

export const getWorkloadForTrainJob = async (job: TrainJobKind): Promise<WorkloadKind | null> => {
  try {
    // Try to find workload by job UID (most reliable)
    const workloadsByUID = await listWorkloads(
      job.metadata.namespace,
      `kueue.x-k8s.io/job-uid=${job.metadata.uid ?? ''}`,
    );
    if (workloadsByUID.length > 0) {
      return workloadsByUID[0];
    }

    // Fallback: try to find by job name if UID doesn't work
    const workloadsByName = await listWorkloads(
      job.metadata.namespace,
      `kueue.x-k8s.io/job-name=${job.metadata.name}`,
    );
    if (workloadsByName.length > 0) {
      return workloadsByName[0];
    }

    return null;
  } catch (error) {
    console.warn('Failed to fetch workload for TrainJob:', error);
    return null;
  }
};

export const patchWorkloadHibernation = async (
  workload: WorkloadKind,
  isHibernated: boolean,
  opts?: K8sAPIOptions,
): Promise<WorkloadKind> => {
  const patchOp = workload.spec.active === undefined ? 'add' : 'replace';
  const result = await k8sPatchResource<WorkloadKind>(
    applyK8sAPIOptions(
      {
        model: WorkloadModel,
        queryOptions: {
          name: workload.metadata?.name || '',
          ns: workload.metadata?.namespace || '',
        },
        patches: [
          {
            op: patchOp,
            path: '/spec/active',
            value: !isHibernated,
          },
        ],
      },
      opts,
    ),
  );

  return result;
};

export const patchTrainJobSuspension = async (
  job: TrainJobKind,
  isSuspended: boolean,
  opts?: K8sAPIOptions,
): Promise<TrainJobKind> => {
  const patchOp = job.spec.suspend === undefined ? 'add' : 'replace';
  const result = await k8sPatchResource<TrainJobKind>(
    applyK8sAPIOptions(
      {
        model: TrainJobModel,
        queryOptions: {
          name: job.metadata.name || '',
          ns: job.metadata.namespace || '',
        },
        patches: [
          {
            op: patchOp,
            path: '/spec/suspend',
            value: isSuspended,
          },
        ],
      },
      opts,
    ),
  );

  return result;
};

export const toggleTrainJobHibernation = async (
  job: TrainJobKind,
  opts?: K8sAPIOptions,
): Promise<{
  success: boolean;
  workload?: WorkloadKind;
  updatedJob?: TrainJobKind;
  error?: string;
}> => {
  try {
    const workload = await getWorkloadForTrainJob(job);

    if (workload) {
      // Path 1: Kueue-enabled job - use workload hibernation
      const isCurrentlyHibernated = workload.spec.active === false;
      const updatedWorkload = await patchWorkloadHibernation(
        workload,
        !isCurrentlyHibernated,
        opts,
      );

      return {
        success: true,
        workload: updatedWorkload,
      };
    }

    // Path 2: Non-Kueue job - use TrainJob spec.suspend
    const isCurrentlySuspended = job.spec.suspend === true;
    const updatedJob = await patchTrainJobSuspension(job, !isCurrentlySuspended, opts);

    return {
      success: true,
      updatedJob,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      error: `Failed to toggle hibernation: ${errorMessage}`,
    };
  }
};
