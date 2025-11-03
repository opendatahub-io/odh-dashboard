import { k8sPatchResource } from '@openshift/dynamic-plugin-sdk-utils';
import { applyK8sAPIOptions } from '@odh-dashboard/internal/api/apiMergeUtils';
import { K8sAPIOptions, WorkloadKind } from '@odh-dashboard/internal/k8sTypes';
import { TrainJobModel } from '@odh-dashboard/internal/api/models/kubeflow';
import { TrainJobKind } from '../k8sTypes';
import { getWorkloadForTrainJob, patchWorkloadHibernation, patchTrainJobSuspension } from '../api';

/**
 * Update the number of nodes for a TrainJob
 * @param job - The TrainJob to update
 * @param newNodeCount - The new number of nodes
 * @param opts - Optional K8s API options
 * @returns Promise with the updated job
 */
export const updateTrainJobNumNodes = async (
  job: TrainJobKind,
  newNodeCount: number,
  opts?: K8sAPIOptions,
): Promise<TrainJobKind> => {
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
            op: 'replace',
            path: '/spec/trainer/numNodes',
            value: newNodeCount,
          },
        ],
      },
      opts,
    ),
  );

  return result;
};

/**
 * Resume a TrainJob (always sets to active/non-suspended state)
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
 * Pause a TrainJob (always sets to hibernated/suspended state)
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
 * Scale nodes and keep the job paused
 * @param job - The TrainJob to update
 * @param newNodeCount - The new number of nodes
 * @param opts - Optional K8s API options
 * @returns Promise with the updated job and pause result
 */
export const scaleNodesAndStayPaused = async (
  job: TrainJobKind,
  newNodeCount: number,
  opts?: K8sAPIOptions,
): Promise<{
  updatedJob: TrainJobKind;
  pauseResult: Awaited<ReturnType<typeof pauseTrainJob>>;
}> => {
  // First scale the nodes
  const updatedJob = await updateTrainJobNumNodes(job, newNodeCount, opts);

  // Then ensure the job stays paused
  const pauseResult = await pauseTrainJob(updatedJob, opts);

  return {
    updatedJob,
    pauseResult,
  };
};

/**
 * Scale nodes and resume the job in one operation
 * @param job - The TrainJob to update
 * @param newNodeCount - The new number of nodes
 * @param opts - Optional K8s API options
 * @returns Promise with the updated job and hibernation result
 */
export const scaleNodesAndResume = async (
  job: TrainJobKind,
  newNodeCount: number,
  opts?: K8sAPIOptions,
): Promise<{
  updatedJob: TrainJobKind;
  hibernationResult: Awaited<ReturnType<typeof resumeTrainJob>>;
}> => {
  // First scale the nodes
  const updatedJob = await updateTrainJobNumNodes(job, newNodeCount, opts);

  // Then resume the job (always sets to active state)
  const hibernationResult = await resumeTrainJob(updatedJob, opts);

  return {
    updatedJob,
    hibernationResult,
  };
};

/**
 * Scale nodes only (without changing pause/resume state)
 * @param job - The TrainJob to update
 * @param newNodeCount - The new number of nodes
 * @param opts - Optional K8s API options
 * @returns Promise with the updated job
 */
export const scaleNodes = async (
  job: TrainJobKind,
  newNodeCount: number,
  opts?: K8sAPIOptions,
): Promise<{
  updatedJob: TrainJobKind;
}> => {
  // Just scale the nodes
  const updatedJob = await updateTrainJobNumNodes(job, newNodeCount, opts);
  return {
    updatedJob,
  };
};
