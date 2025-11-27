import {
  k8sDeleteResource,
  K8sStatus,
  k8sPatchResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { applyK8sAPIOptions } from '@odh-dashboard/internal/api/apiMergeUtils';
import { K8sAPIOptions } from '@odh-dashboard/internal/k8sTypes';
import { groupVersionKind } from '@odh-dashboard/internal/api/k8sUtils';
import { TrainJobModel } from '@odh-dashboard/internal/api/models/kubeflow';
import { CustomWatchK8sResult } from '@odh-dashboard/internal/types';
import useK8sWatchResourceList from '@odh-dashboard/internal/utilities/useK8sWatchResourceList';
import { patchTrainJobSuspension } from './lifecycle';
import { deleteJobSetForTrainJob, deleteWorkloadForTrainJob } from './workloads';
import { TrainJobKind } from '../k8sTypes';

/**
 * Watch TrainJobs in a namespace
 * @param namespace - The namespace to watch
 * @returns Custom watch result with TrainJob list
 */
export const useTrainJobs = (namespace: string): CustomWatchK8sResult<TrainJobKind[]> =>
  useK8sWatchResourceList(
    {
      isList: true,
      groupVersionKind: groupVersionKind(TrainJobModel),
      namespace,
    },
    TrainJobModel,
  );

/**
 * Delete a TrainJob
 * @param name - The name of the TrainJob
 * @param namespace - The namespace of the TrainJob
 * @param opts - Optional K8s API options
 * @returns Promise with K8s status
 */
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

/**
 * Retry a failed TrainJob
 * This function:
 * 1. Deletes the JobSet to clear failed state
 * 2. Deletes the Workload so Kueue can recreate it
 * 3. Unsuspends the job if it's suspended
 * 4. Adds a retry timestamp annotation to trigger reconciliation
 *
 * @param job - The TrainJob to retry
 * @param opts - Optional K8s API options
 * @returns Promise with the updated TrainJob
 */
export const retryTrainJob = async (
  job: TrainJobKind,
  opts?: K8sAPIOptions,
): Promise<TrainJobKind> => {
  const jobName = job.metadata.name;
  const namespace = job.metadata.namespace || '';

  // Delete JobSet to clear failed state
  await deleteJobSetForTrainJob(jobName, namespace, opts);

  // Delete Workload so Kueue can recreate it
  await deleteWorkloadForTrainJob(job, opts);

  try {
    // If job is suspended, unsuspend it
    if (job.spec.suspend === true) {
      return await patchTrainJobSuspension(job, false, opts);
    }

    // Add retry timestamp annotation to trigger reconciliation
    const patches = [
      {
        op: 'add' as const,
        path: '/metadata/annotations',
        value: {
          ...(job.metadata.annotations || {}),
          'trainer.kubeflow.org/retry-timestamp': new Date().toISOString(),
        },
      },
    ];

    return await k8sPatchResource<TrainJobKind>(
      applyK8sAPIOptions(
        {
          model: TrainJobModel,
          queryOptions: {
            name: job.metadata.name || '',
            ns: job.metadata.namespace || '',
          },
          patches,
        },
        opts,
      ),
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    throw new Error(`Failed to retry job: ${errorMessage}`);
  }
};
