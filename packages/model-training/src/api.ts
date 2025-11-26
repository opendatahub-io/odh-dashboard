import {
  k8sDeleteResource,
  K8sResourceCommon,
  K8sStatus,
  k8sPatchResource,
  k8sGetResource,
  k8sListResource,
} from '@openshift/dynamic-plugin-sdk-utils';
import { applyK8sAPIOptions } from '@odh-dashboard/internal/api/apiMergeUtils';
import { K8sAPIOptions, WorkloadKind, PodKind } from '@odh-dashboard/internal/k8sTypes';
import { PodModel } from '@odh-dashboard/internal/api/models/index';
import { listWorkloads } from '@odh-dashboard/internal/api/k8s/workloads';
import { WorkloadModel } from '@odh-dashboard/internal/api/models/kueue';
import { groupVersionKind } from '@odh-dashboard/internal/api/k8sUtils';
import { CustomWatchK8sResult } from '@odh-dashboard/internal/types';
import useK8sWatchResourceList from '@odh-dashboard/internal/utilities/useK8sWatchResourceList';
import {
  TrainJobModel,
  ClusterTrainingRuntimeModel,
} from '@odh-dashboard/internal/api/models/kubeflow';
import { TrainJobKind, ClusterTrainingRuntimeKind } from './k8sTypes';

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

export const getClusterTrainingRuntime = (
  name: string,
  opts?: K8sAPIOptions,
): Promise<ClusterTrainingRuntimeKind> =>
  k8sGetResource<ClusterTrainingRuntimeKind>(
    applyK8sAPIOptions(
      {
        model: ClusterTrainingRuntimeModel,
        queryOptions: { name },
      },
      opts,
    ),
  );

export const getPodsForTrainJob = (job: TrainJobKind): Promise<PodKind[]> =>
  k8sListResource<PodKind>({
    model: PodModel,
    queryOptions: {
      ns: job.metadata.namespace,
      queryParams: { labelSelector: `jobset.sigs.k8s.io/jobset-name=${job.metadata.name}` },
    },
  }).then((r) => r.items);
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

export const deleteWorkloadForTrainJob = async (
  job: TrainJobKind,
  opts?: K8sAPIOptions,
): Promise<void> => {
  try {
    /*** The Workload needs to be deleted so Kueue can recreate it.
     * This allows the job to be re-queued and re-admitted. */
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

export const retryTrainJob = async (
  job: TrainJobKind,
  opts?: K8sAPIOptions,
): Promise<TrainJobKind> => {
  const jobName = job.metadata.name;
  const namespace = job.metadata.namespace || '';

  await deleteJobSetForTrainJob(jobName, namespace, opts);

  await deleteWorkloadForTrainJob(job, opts);

  try {
    if (job.spec.suspend === true) {
      return await patchTrainJobSuspension(job, false, opts);
    }

    const patches = [
      {
        op: 'add',
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
