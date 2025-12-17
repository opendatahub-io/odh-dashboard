import { k8sPatchResource } from '@openshift/dynamic-plugin-sdk-utils';
import { applyK8sAPIOptions } from '@odh-dashboard/internal/api/apiMergeUtils';
import { K8sAPIOptions, WorkloadKind } from '@odh-dashboard/internal/k8sTypes';
import { listWorkloads } from '@odh-dashboard/internal/api/k8s/workloads';
import { WorkloadModel } from '@odh-dashboard/internal/api/models/kueue';
import { TrainJobKind } from '../k8sTypes';

/**
 * Get the Workload associated with a TrainJob
 * Tries to find by job UID first, then falls back to job name
 *
 * @param job - The TrainJob to find the workload for
 * @returns Promise with the Workload or null if not found
 */
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

/**
 * Patch a Workload's active state for pause/resume functionality
 * Sets workload.spec.active to control whether the workload is active or paused
 *
 * @param workload - The Workload to patch
 * @param isPaused - Whether the workload should be paused (true) or active (false)
 * @param opts - Optional K8s API options
 * @returns Promise with the updated Workload
 */
export const patchWorkloadActiveState = async (
  workload: WorkloadKind,
  isPaused: boolean,
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
            value: !isPaused, // active = !paused
          },
        ],
      },
      opts,
    ),
  );

  return result;
};
