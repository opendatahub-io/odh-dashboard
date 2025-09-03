import { k8sPatchResource } from '@openshift/dynamic-plugin-sdk-utils';
import { applyK8sAPIOptions } from '@odh-dashboard/internal/api/apiMergeUtils';
import { K8sAPIOptions, WorkloadKind } from '@odh-dashboard/internal/k8sTypes';
import { PyTorchJobModel } from '@odh-dashboard/internal/api/models/kubeflow';
import { PyTorchJobKind } from '../k8sTypes';
import {
  getWorkloadForPyTorchJob,
  patchWorkloadHibernation,
  patchPyTorchJobSuspension,
} from '../api';

/**
 * Update the worker replica count for a PyTorchJob
 * @param job - The PyTorchJob to update
 * @param newWorkerCount - The new number of worker replicas
 * @param opts - Optional K8s API options
 * @returns Promise with the updated job
 */
export const updatePyTorchJobWorkerReplicas = async (
  job: PyTorchJobKind,
  newWorkerCount: number,
  opts?: K8sAPIOptions,
): Promise<PyTorchJobKind> => {
  const result = await k8sPatchResource<PyTorchJobKind>(
    applyK8sAPIOptions(
      {
        model: PyTorchJobModel,
        queryOptions: {
          name: job.metadata.name || '',
          ns: job.metadata.namespace || '',
        },
        patches: [
          {
            op: 'replace',
            path: '/spec/pytorchReplicaSpecs/Worker/replicas',
            value: newWorkerCount,
          },
        ],
      },
      opts,
    ),
  );

  return result;
};

/**
 * Resume a PyTorchJob (always sets to active/non-suspended state)
 * @param job - The PyTorchJob to resume
 * @param opts - Optional K8s API options
 * @returns Promise with success status and updated resources
 */
export const resumePyTorchJob = async (
  job: PyTorchJobKind,
  opts?: K8sAPIOptions,
): Promise<{
  success: boolean;
  workload?: WorkloadKind;
  updatedJob?: PyTorchJobKind;
  error?: string;
}> => {
  try {
    const workload = await getWorkloadForPyTorchJob(job);

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

    // Path 2: Non-Kueue job - set runPolicy.suspend = false
    const updatedJob = await patchPyTorchJobSuspension(job, false, opts);

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
 * Pause a PyTorchJob (always sets to hibernated/suspended state)
 * @param job - The PyTorchJob to pause
 * @param opts - Optional K8s API options
 * @returns Promise with success status and updated resources
 */
export const pausePyTorchJob = async (
  job: PyTorchJobKind,
  opts?: K8sAPIOptions,
): Promise<{
  success: boolean;
  workload?: WorkloadKind;
  updatedJob?: PyTorchJobKind;
  error?: string;
}> => {
  try {
    const workload = await getWorkloadForPyTorchJob(job);

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

    // Path 2: Non-Kueue job - set runPolicy.suspend = true
    const updatedJob = await patchPyTorchJobSuspension(job, true, opts);

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
 * Scale worker replicas and keep the job paused
 * @param job - The PyTorchJob to update
 * @param newWorkerCount - The new number of worker replicas
 * @param opts - Optional K8s API options
 * @returns Promise with the updated job and pause result
 */
export const scaleWorkersAndStayPaused = async (
  job: PyTorchJobKind,
  newWorkerCount: number,
  opts?: K8sAPIOptions,
): Promise<{
  updatedJob: PyTorchJobKind;
  pauseResult: Awaited<ReturnType<typeof pausePyTorchJob>>;
}> => {
  // First scale the workers
  const updatedJob = await updatePyTorchJobWorkerReplicas(job, newWorkerCount, opts);

  // Then ensure the job stays paused
  const pauseResult = await pausePyTorchJob(updatedJob, opts);

  return {
    updatedJob,
    pauseResult,
  };
};

/**
 * Scale worker replicas and resume the job in one operation
 * @param job - The PyTorchJob to update
 * @param newWorkerCount - The new number of worker replicas
 * @param opts - Optional K8s API options
 * @returns Promise with the updated job and hibernation result
 */
export const scaleWorkersAndResume = async (
  job: PyTorchJobKind,
  newWorkerCount: number,
  opts?: K8sAPIOptions,
): Promise<{
  updatedJob: PyTorchJobKind;
  hibernationResult: Awaited<ReturnType<typeof resumePyTorchJob>>;
}> => {
  // First scale the workers
  const updatedJob = await updatePyTorchJobWorkerReplicas(job, newWorkerCount, opts);

  // Then resume the job (always sets to active state)
  const hibernationResult = await resumePyTorchJob(updatedJob, opts);

  return {
    updatedJob,
    hibernationResult,
  };
};
