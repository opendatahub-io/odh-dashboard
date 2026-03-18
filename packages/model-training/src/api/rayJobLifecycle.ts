import { k8sPatchResource } from '@openshift/dynamic-plugin-sdk-utils';
import { applyK8sAPIOptions } from '@odh-dashboard/internal/api/apiMergeUtils';
import { K8sAPIOptions } from '@odh-dashboard/internal/k8sTypes';
import { RayJobModel } from '@odh-dashboard/internal/api/models/kubeflow';
import { getWorkloadForJob, patchWorkloadActiveState } from './workloads';
import { RayJobKind } from '../k8sTypes';

/**
 * Patch a RayJob's suspension state
 * Sets spec.suspend to control whether the job is suspended
 */
export const patchRayJobSuspension = async (
  job: RayJobKind,
  isSuspended: boolean,
  opts?: K8sAPIOptions,
): Promise<RayJobKind> => {
  const patchOp = job.spec.suspend === undefined ? 'add' : 'replace';
  return k8sPatchResource<RayJobKind>(
    applyK8sAPIOptions(
      {
        model: RayJobModel,
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
};

/**
 * Set a RayJob's pause state (pause or resume)
 * For Kueue-enabled jobs: sets workload.spec.active
 * For non-Kueue jobs: sets spec.suspend
 */
export const setRayJobPauseState = async (
  job: RayJobKind,
  pause: boolean,
  opts?: K8sAPIOptions,
): Promise<{
  success: boolean;
  updatedJob?: RayJobKind;
  error?: string;
}> => {
  try {
    const workload = await getWorkloadForJob(job);

    if (workload) {
      await patchWorkloadActiveState(workload, pause, opts);
      return { success: true };
    }

    const updatedJob = await patchRayJobSuspension(job, pause, opts);
    return { success: true, updatedJob };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    const action = pause ? 'pause' : 'resume';
    return {
      success: false,
      error: `Failed to ${action} job: ${errorMessage}`,
    };
  }
};
