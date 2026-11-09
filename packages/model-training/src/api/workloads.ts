import { k8sGetResource, k8sPatchResource } from '@openshift/dynamic-plugin-sdk-utils';
import {
  applyK8sAPIOptions,
  K8sAPIOptions,
  K8sResourceCommon,
  WorkloadKind,
} from '@odh-dashboard/k8s-core';
import { listWorkloads } from '@odh-dashboard/internal/api/k8s/workloads';
import { WorkloadModel, JobSetModel } from '@odh-dashboard/k8s-core/api/models';
import { UnifiedJobKind, isTrainJob } from '../types';

/**
 * Get the Workload associated with a job (TrainJob or RayJob).
 *
 * Resolution order:
 *  1. Label kueue.x-k8s.io/job-uid = job UID  (works for most job types)
 *  2. Label kueue.x-k8s.io/job-name = job name (fallback)
 *  3. [TrainJob only] Fetch the JobSet with the same name, take its UID,
 *     and search by kueue.x-k8s.io/job-uid = JobSet UID.
 *     The Training Operator creates a JobSet with the same name as the
 *     TrainJob, and Kueue labels the Workload with the JobSet UID —
 *     not the TrainJob UID.
 *
 * @param job - The job (TrainJob or RayJob) to find the workload for
 * @returns Promise with the Workload or null if not found
 */
export const getWorkloadForJob = async (job: UnifiedJobKind): Promise<WorkloadKind | null> => {
  try {
    // 1. Try to find workload by job UID (most reliable for non-TrainJob)
    const workloadsByUID = await listWorkloads(
      job.metadata.namespace,
      `kueue.x-k8s.io/job-uid=${job.metadata.uid ?? ''}`,
    );
    if (workloadsByUID.length > 0) {
      return workloadsByUID[0];
    }

    // 2. Fallback: try to find by job name
    const workloadsByName = await listWorkloads(
      job.metadata.namespace,
      `kueue.x-k8s.io/job-name=${job.metadata.name}`,
    );
    if (workloadsByName.length > 0) {
      return workloadsByName[0];
    }

    // 3. TrainJob-specific: resolve via the JobSet UID.
    //    The Training Operator creates a JobSet with the same name as the
    //    TrainJob. Kueue labels the Workload with that JobSet's UID.
    if (isTrainJob(job)) {
      try {
        const jobSet = await k8sGetResource<K8sResourceCommon>({
          model: JobSetModel,
          queryOptions: { name: job.metadata.name, ns: job.metadata.namespace },
        });
        if (jobSet.metadata?.uid) {
          const workloadsByJobSetUID = await listWorkloads(
            job.metadata.namespace,
            `kueue.x-k8s.io/job-uid=${jobSet.metadata.uid}`,
          );
          if (workloadsByJobSetUID.length > 0) {
            return workloadsByJobSetUID[0];
          }
        }
      } catch (e) {
        console.warn(`Failed to resolve JobSet "${job.metadata.name}" for TrainJob:`, e);
      }
    }

    return null;
  } catch (error) {
    console.warn('Failed to fetch workload for job:', error);
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
