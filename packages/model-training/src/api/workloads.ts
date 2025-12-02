import {
  k8sDeleteResource,
  K8sStatus,
  k8sPatchResource,
  K8sResourceCommon,
} from '@openshift/dynamic-plugin-sdk-utils';
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
 * Patch a Workload's hibernation state
 * Sets workload.spec.active to control whether the workload is active or hibernated
 *
 * @param workload - The Workload to patch
 * @param isHibernated - Whether the workload should be hibernated (true) or active (false)
 * @param opts - Optional K8s API options
 * @returns Promise with the updated Workload
 */
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
            value: !isHibernated, // active = !hibernated
          },
        ],
      },
      opts,
    ),
  );

  return result;
};

/**
 * Delete the Workload associated with a TrainJob
 * This is necessary when retrying a job so Kueue can recreate the workload
 *
 * @param job - The TrainJob whose workload should be deleted
 * @param opts - Optional K8s API options
 * @returns Promise that resolves when deletion is complete
 */
export const deleteWorkloadForTrainJob = async (
  job: TrainJobKind,
  opts?: K8sAPIOptions,
): Promise<void> => {
  try {
    const workload = await getWorkloadForTrainJob(job);
    if (workload && workload.metadata?.name) {
      await k8sDeleteResource<WorkloadKind, K8sStatus>(
        applyK8sAPIOptions(
          {
            model: WorkloadModel,
            queryOptions: {
              name: workload.metadata.name,
              ns: workload.metadata.namespace || job.metadata.namespace || '',
            },
          },
          opts,
        ),
      );
    }
  } catch (error) {
    console.warn(
      `Workload deletion for TrainJob ${job.metadata.name} in namespace ${job.metadata.namespace} returned error (expected if resource doesn't exist):`,
      error,
    );
  }
};

/**
 * Delete the JobSet associated with a TrainJob
 * This is necessary when retrying a job to clear failed state
 *
 * @param jobName - The name of the TrainJob (also the JobSet name)
 * @param namespace - The namespace of the JobSet
 * @param opts - Optional K8s API options
 * @returns Promise that resolves when deletion is complete
 */
export const deleteJobSetForTrainJob = async (
  jobName: string,
  namespace: string,
  opts?: K8sAPIOptions,
): Promise<void> => {
  try {
    const jobSetModel = {
      apiGroup: 'jobset.x-k8s.io',
      apiVersion: 'v1alpha2',
      kind: 'JobSet',
      plural: 'jobsets',
    };
    await k8sDeleteResource<K8sResourceCommon, K8sStatus>(
      applyK8sAPIOptions(
        {
          model: jobSetModel,
          queryOptions: { name: jobName, ns: namespace },
        },
        opts,
      ),
    );
  } catch (error) {
    console.warn(
      `JobSet deletion for ${jobName} in namespace ${namespace} returned error (expected if resource doesn't exist):`,
      error,
    );
  }
};
