import * as React from 'react';
import useClusterTrainingRuntime from './useClusterTrainingRuntime';
import { TrainJobKind } from '../k8sTypes';

type UseTrainingJobNodeScalingReturn = {
  nodesCount: number;
};

/**
 * Custom hook to resolve the node count of a training job for display.
 *
 * Post-create node scaling was removed for RHOAI 3.6 (RHOAIENG-88673). Kubeflow
 * Trainer 2.2 made `spec.trainer` immutable (kubeflow/trainer#3157), so PATCHing
 * `spec.trainer.numNodes` after create is rejected by the TrainJob validating
 * webhook, and upstream has not shipped a replacement API for scaling a job after
 * it has been created. Rather than leave a broken action in the product, the scale
 * modal, its API client and every entry point were removed. To restore the feature
 * once upstream supports it again, revert the commit referencing RHOAIENG-88673.
 *
 * The node count itself is still resolved here, because the jobs table and the
 * details drawer display it read-only.
 *
 * @param job - The training job to resolve the node count for (can be undefined)
 * @returns Object containing the resolved node count
 */
export const useTrainingJobNodeScaling = (
  job: TrainJobKind | undefined,
): UseTrainingJobNodeScalingReturn => {
  // Fetch ClusterTrainingRuntime if trainer spec is not available
  const runtimeName =
    job?.spec.runtimeRef.kind === 'ClusterTrainingRuntime' ? job.spec.runtimeRef.name : null;
  const { clusterTrainingRuntime, loaded: runtimeLoaded } = useClusterTrainingRuntime(
    job && !job.spec.trainer ? runtimeName : null,
  );

  // Get numNodes from trainer spec or ClusterTrainingRuntime
  const nodesCount = React.useMemo(() => {
    if (!job) {
      return 0;
    }
    if (job.spec.trainer?.numNodes) {
      return job.spec.trainer.numNodes;
    }
    if (runtimeLoaded && clusterTrainingRuntime?.spec.mlPolicy?.numNodes) {
      return clusterTrainingRuntime.spec.mlPolicy.numNodes;
    }
    return 0;
  }, [job, runtimeLoaded, clusterTrainingRuntime]);

  return {
    nodesCount,
  };
};
