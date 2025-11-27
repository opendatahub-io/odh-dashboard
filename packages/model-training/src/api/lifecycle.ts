import { k8sPatchResource } from '@openshift/dynamic-plugin-sdk-utils';
import { applyK8sAPIOptions } from '@odh-dashboard/internal/api/apiMergeUtils';
import { K8sAPIOptions, WorkloadKind } from '@odh-dashboard/internal/k8sTypes';
import { TrainJobModel } from '@odh-dashboard/internal/api/models/kubeflow';
import { getWorkloadForTrainJob, patchWorkloadHibernation } from './workloads';
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
 * Pause a TrainJob (sets to suspended state)
 * For Kueue-enabled jobs: sets workload.spec.active = false
 * For non-Kueue jobs: sets spec.suspend = true
 *
 * @param job - The TrainJob to pause
 * @param opts - Optional K8s API options
 * @returns Promise with success status and updated resources
 */
export const pauseTrainJob = async (
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
      // Path 1: Kueue-enabled job - set workload.spec.active = false
      const updatedWorkload = await patchWorkloadHibernation(
        workload,
        true, // true = hibernated = not active
        opts,
      );

      return {
        success: true,
        workload: updatedWorkload,
      };
    }

    // Path 2: Non-Kueue job - set spec.suspend = true
    const updatedJob = await patchTrainJobSuspension(job, true, opts);

    return {
      success: true,
      updatedJob,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      error: `Failed to pause job: ${errorMessage}`,
    };
  }
};

/**
 * Resume a TrainJob (sets to active/non-suspended state)
 * For Kueue-enabled jobs: sets workload.spec.active = true
 * For non-Kueue jobs: sets spec.suspend = false
 *
 * @param job - The TrainJob to resume
 * @param opts - Optional K8s API options
 * @returns Promise with success status and updated resources
 */
export const resumeTrainJob = async (
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
      // Path 1: Kueue-enabled job - set workload.spec.active = true
      const updatedWorkload = await patchWorkloadHibernation(
        workload,
        false, // false = not hibernated = active
        opts,
      );

      return {
        success: true,
        workload: updatedWorkload,
      };
    }

    // Path 2: Non-Kueue job - set spec.suspend = false
    const updatedJob = await patchTrainJobSuspension(job, false, opts);

    return {
      success: true,
      updatedJob,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return {
      success: false,
      error: `Failed to resume job: ${errorMessage}`,
    };
  }
};

/**
 * Toggle a TrainJob's hibernation state
 * Automatically detects current state and toggles it
 * For Kueue-enabled jobs: toggles workload.spec.active
 * For non-Kueue jobs: toggles spec.suspend
 *
 * @param job - The TrainJob to toggle
 * @param opts - Optional K8s API options
 * @returns Promise with success status and updated resources
 */
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
      // Path 1: Kueue-enabled job - toggle workload hibernation
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

    // Path 2: Non-Kueue job - toggle TrainJob spec.suspend
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
