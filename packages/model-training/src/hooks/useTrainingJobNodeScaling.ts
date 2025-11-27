import * as React from 'react';
import useNotification from '@odh-dashboard/internal/utilities/useNotification';
import useClusterTrainingRuntime from './useClusterTrainingRuntime';
import { scaleNodes } from '../api';
import { getStatusFlags, getTrainingJobStatusSync } from '../global/trainingJobList/utils';
import { TrainJobKind } from '../k8sTypes';
import { TrainingJobState } from '../types';

type UseTrainingJobNodeScalingReturn = {
  nodesCount: number;
  canScaleNodes: boolean;
  isScaling: boolean;
  scaleNodesModalOpen: boolean;
  setScaleNodesModalOpen: (open: boolean) => void;
  handleScaleNodes: (newNodeCount: number) => Promise<void>;
};

/**
 * Custom hook to manage node scaling functionality for training jobs
 * Handles node count calculation, scaling eligibility, and scaling operations
 *
 * Node scaling is enabled when the job is in one of these statuses:
 * - Paused: Job is paused
 * - Queued: Job is waiting for resources
 * - Inadmissible: Job cannot be admitted due to quota/resource constraints
 * - Preempted: Job was preempted by higher priority workloads
 *
 * @param job - The training job to manage scaling for (can be undefined)
 * @param jobStatus - Optional pre-fetched job status (falls back to sync calculation)
 * @returns Object containing node count, scaling state, and handlers
 */
export const useTrainingJobNodeScaling = (
  job: TrainJobKind | undefined,
  jobStatus?: TrainingJobState,
): UseTrainingJobNodeScalingReturn => {
  const notification = useNotification();
  const [scaleNodesModalOpen, setScaleNodesModalOpen] = React.useState(false);
  const [isScaling, setIsScaling] = React.useState(false);

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

  // Determine if scaling is allowed
  const status = job && jobStatus ? jobStatus : job ? getTrainingJobStatusSync(job) : undefined;
  const { isPaused, isQueued, isInadmissible, isPreempted } = status
    ? getStatusFlags(status)
    : {
        isPaused: false,
        isQueued: false,
        isInadmissible: false,
        isPreempted: false,
      };
  const canScaleNodes =
    job !== undefined &&
    jobStatus !== undefined &&
    (isPaused || isQueued || isInadmissible || isPreempted);

  const handleScaleNodes = React.useCallback(
    async (newNodeCount: number) => {
      if (!job) {
        return;
      }
      setIsScaling(true);
      try {
        await scaleNodes(job, newNodeCount);
        notification.success('Node scaling successful', `Scaled to ${newNodeCount} nodes`);
        // Note: The job will be refreshed by the watch mechanism
      } catch (error) {
        console.error('Error scaling nodes:', error);
        notification.error(
          'Failed to scale nodes',
          error instanceof Error ? error.message : 'Unknown error occurred',
        );
      } finally {
        setIsScaling(false);
        setScaleNodesModalOpen(false);
      }
    },
    [job, notification],
  );

  return {
    nodesCount,
    canScaleNodes,
    isScaling,
    scaleNodesModalOpen,
    setScaleNodesModalOpen,
    handleScaleNodes,
  };
};
