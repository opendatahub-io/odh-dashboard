import { k8sPatchResource } from '@openshift/dynamic-plugin-sdk-utils';
import { applyK8sAPIOptions } from '@odh-dashboard/internal/api/apiMergeUtils';
import { K8sAPIOptions, WorkloadKind } from '@odh-dashboard/internal/k8sTypes';
import { TrainJobModel } from '@odh-dashboard/internal/api/models/kubeflow';
import { getWorkloadForTrainJob, patchWorkloadActiveState } from './workloads';
import { TrainJobKind } from '../k8sTypes';

/**
 * Patch a TrainJob's suspension state
 * Sets spec.suspend to control whether the job is suspended
 *
 * @param job - The TrainJob to patch
 * @param isSuspended - Whether the job should be suspended
 * @param opts - Optional K8s API options
 * @returns Promise with the updated TrainJob
 */
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

/**
 * Set a TrainJob's pause state (pause or resume)
 * For Kueue-enabled jobs: sets workload.spec.active
 * For non-Kueue jobs: sets spec.suspend
 *
 * @param job - The TrainJob to update
 * @param pause - true to pause the job, false to resume it
 * @param opts - Optional K8s API options
 * @returns Promise with success status and updated resources
 */
export const setTrainJobPauseState = async (
  job: TrainJobKind,
  pause: boolean,
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
      // Kueue-enabled job - set workload.spec.active (active = !pause)
      const updatedWorkload = await patchWorkloadActiveState(workload, pause, opts);

      return {
        success: true,
        workload: updatedWorkload,
      };
    }

    // Non-Kueue job - set spec.suspend
    const updatedJob = await patchTrainJobSuspension(job, pause, opts);

    return {
      success: true,
      updatedJob,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const action = pause ? 'pause' : 'resume';
    return {
      success: false,
      error: `Failed to ${action} job: ${errorMessage}`,
    };
  }
};
