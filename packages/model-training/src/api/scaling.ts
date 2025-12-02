import { k8sPatchResource } from '@openshift/dynamic-plugin-sdk-utils';
import { applyK8sAPIOptions } from '@odh-dashboard/internal/api/apiMergeUtils';
import { K8sAPIOptions } from '@odh-dashboard/internal/k8sTypes';
import { TrainJobModel } from '@odh-dashboard/internal/api/models/kubeflow';
import { TrainJobKind } from '../k8sTypes';

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
  const patchOp = job.spec.trainer?.numNodes === undefined ? 'add' : 'replace';
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
