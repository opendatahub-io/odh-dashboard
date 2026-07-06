import * as React from 'react';
import useNotification from '@odh-dashboard/internal/utilities/useNotification';
import { useAccessReview } from '@odh-dashboard/internal/api/useAccessReview';
import { RayJobModel } from '@odh-dashboard/internal/api/models/kubeflow';
import { updateRayJobNumNodes } from '../api';
import { getStatusFlags, getRayJobStatusSync } from '../global/trainingJobList/utils';
import { RayJobKind } from '../k8sTypes';
import { JobDisplayState } from '../types';

export type WorkerGroupReplicaState = {
  groupName: string;
  replicas: number;
};

type UseRayJobNodeScalingReturn = {
  workerGroupReplicas: WorkerGroupReplicaState[];
  setWorkerGroupReplicas: React.Dispatch<React.SetStateAction<WorkerGroupReplicaState[]>>;
  hasChanges: boolean;
  canEditNodes: boolean;
  isScaling: boolean;
  modalOpen: boolean;
  setModalOpen: (open: boolean) => void;
  handleSave: () => Promise<void>;
};

/**
 * Manages node scaling state for RayJobs.
 *
 * Only lifecycled RayJobs (with inline spec.rayClusterSpec) support node editing.
 * Workspace-cluster RayJobs (using spec.clusterSelector) are read-only because
 */
export const useRayJobNodeScaling = (
  job: RayJobKind | undefined,
  jobStatus?: JobDisplayState,
): UseRayJobNodeScalingReturn => {
  const notification = useNotification();
  const [modalOpen, setModalOpen] = React.useState(false);
  const [isScaling, setIsScaling] = React.useState(false);

  const initialReplicas = React.useMemo(
    (): WorkerGroupReplicaState[] =>
      job?.spec.rayClusterSpec?.workerGroupSpecs?.map((g) => ({
        groupName: g.groupName,
        replicas: g.replicas ?? 0,
      })) ?? [],
    [job],
  );

  const [workerGroupReplicas, setWorkerGroupReplicas] =
    React.useState<WorkerGroupReplicaState[]>(initialReplicas);

  // Re-sync local state when the job changes (e.g. after a successful save)
  React.useEffect(() => {
    setWorkerGroupReplicas(initialReplicas);
  }, [initialReplicas]);

  const hasChanges = React.useMemo(
    () =>
      workerGroupReplicas.some((wg) => {
        const original = initialReplicas.find((r) => r.groupName === wg.groupName);
        return original === undefined || original.replicas !== wg.replicas;
      }),
    [workerGroupReplicas, initialReplicas],
  );

  const [canPatch] = useAccessReview(
    {
      group: RayJobModel.apiGroup,
      resource: RayJobModel.plural,
      verb: 'patch',
      namespace: job?.metadata.namespace,
    },
    job !== undefined,
  );

  const status = job && jobStatus ? jobStatus : job ? getRayJobStatusSync(job) : undefined;
  const { isFailed, isComplete, isDeleting } = status
    ? getStatusFlags(status)
    : { isFailed: false, isComplete: false, isDeleting: false };

  const canEditNodes =
    !!job?.spec.rayClusterSpec &&
    !!jobStatus &&
    !isFailed &&
    !isComplete &&
    !isDeleting &&
    canPatch;

  const handleSave = React.useCallback(async () => {
    if (!job) {
      return;
    }
    setIsScaling(true);
    try {
      await updateRayJobNumNodes(job, workerGroupReplicas);
      notification.success('Node count updated', 'Worker node counts have been saved.');
      setModalOpen(false);
    } catch (error) {
      notification.error(
        'Failed to update node count',
        error instanceof Error ? error.message : 'Unknown error occurred',
      );
    } finally {
      setIsScaling(false);
    }
  }, [job, workerGroupReplicas, notification]);

  return {
    workerGroupReplicas,
    setWorkerGroupReplicas,
    hasChanges,
    canEditNodes,
    isScaling,
    modalOpen,
    setModalOpen,
    handleSave,
  };
};
