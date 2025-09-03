import * as React from 'react';
import { Tr, Td, ActionsColumn } from '@patternfly/react-table';
import {
  Timestamp,
  Flex,
  FlexItem,
  TimestampTooltipVariant,
  Icon,
  Tooltip,
  Button,
} from '@patternfly/react-core';
import { CubesIcon, EditIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import ResourceNameTooltip from '@odh-dashboard/internal/components/ResourceNameTooltip';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import { relativeTime } from '@odh-dashboard/internal/utilities/time';
import TrainingJobProject from './TrainingJobProject';
import { getTrainingJobStatusSync } from './utils';
import TrainingJobClusterQueue from './TrainingJobClusterQueue';
import HibernationToggleModal from './HibernationToggleModal';
import TrainingJobStatus from './components/TrainingJobStatus';
import ScaleWorkersModal from './ScaleWorkersModal';
import { PyTorchJobKind } from '../../k8sTypes';
import { PyTorchJobState } from '../../types';
import { togglePyTorchJobHibernation } from '../../api';
import { updatePyTorchJobWorkerReplicas, resumePyTorchJob } from '../../api/scaling';

type PyTorchJobTableRowProps = {
  job: PyTorchJobKind;
  jobStatus?: PyTorchJobState;
  onDelete: (job: PyTorchJobKind) => void;
  onStatusUpdate?: (jobId: string, newStatus: PyTorchJobState) => void;
  onJobUpdate?: (jobId: string, updatedJob: PyTorchJobKind) => void;
};

const TrainingJobTableRow: React.FC<PyTorchJobTableRowProps> = ({
  job,
  jobStatus,
  onDelete,
  onStatusUpdate,
  onJobUpdate,
}) => {
  const [hibernationModalOpen, setHibernationModalOpen] = React.useState(false);
  const [scaleWorkersModalOpen, setScaleWorkersModalOpen] = React.useState(false);
  const [isToggling, setIsToggling] = React.useState(false);
  const [isScaling, setIsScaling] = React.useState(false);

  const displayName = getDisplayNameFromK8sResource(job);
  const workerReplicas = job.spec.pytorchReplicaSpecs.Worker?.replicas || 0;
  const masterReplicas = job.spec.pytorchReplicaSpecs.Master?.replicas || 0;
  const nodesCount = workerReplicas + masterReplicas;
  const localQueueName = job.metadata.labels?.['kueue.x-k8s.io/queue-name'];

  const status = jobStatus || getTrainingJobStatusSync(job);
  const isPaused = status === PyTorchJobState.PAUSED;
  const isPreempted = status === PyTorchJobState.PREEMPTED;
  const isQueued = status === PyTorchJobState.QUEUED;
  const canScaleWorkers = isPaused; // Only allow scaling when paused

  const handleHibernationToggle = async () => {
    setIsToggling(true);
    try {
      const result = await togglePyTorchJobHibernation(job);
      if (result.success) {
        // Update status optimistically based on current state
        const newStatus = isPaused ? PyTorchJobState.RUNNING : PyTorchJobState.PAUSED;
        const jobId = job.metadata.uid || job.metadata.name;
        onStatusUpdate?.(jobId, newStatus);
      } else {
        console.error('Failed to toggle hibernation:', result.error);
        // TODO: Show error notification
      }
    } catch (error) {
      console.error('Error toggling hibernation:', error);
      // TODO: Show error notification
    } finally {
      setIsToggling(false);
      setHibernationModalOpen(false);
    }
  };

  const handleScaleWorkers = async (newWorkerCount: number) => {
    setIsScaling(true);
    try {
      const result = await updatePyTorchJobWorkerReplicas(job, newWorkerCount);
      if (result.success && result.updatedJob) {
        const jobId = job.metadata.uid || job.metadata.name;
        onJobUpdate?.(jobId, result.updatedJob);
      } else {
        console.error('Failed to scale workers:', result.error);
        throw new Error(result.error || 'Failed to scale workers');
      }
    } catch (error) {
      console.error('Error scaling workers:', error);
      throw error; // Re-throw to let modal handle the error
    } finally {
      setIsScaling(false);
    }
  };

  const handleScaleWorkersAndResume = async (newWorkerCount: number) => {
    setIsScaling(true);
    try {
      // First scale the workers
      const scaleResult = await updatePyTorchJobWorkerReplicas(job, newWorkerCount);
      if (!scaleResult.success || !scaleResult.updatedJob) {
        throw new Error(scaleResult.error || 'Failed to scale workers');
      }

      // Then resume the job
      const resumeResult = await resumePyTorchJob(scaleResult.updatedJob);
      if (!resumeResult.success) {
        throw new Error(resumeResult.error || 'Failed to resume job after scaling');
      }

      // Update both job and status
      const jobId = job.metadata.uid || job.metadata.name;
      onJobUpdate?.(jobId, scaleResult.updatedJob);
      onStatusUpdate?.(jobId, PyTorchJobState.RUNNING);
    } catch (error) {
      console.error('Error scaling workers and resuming:', error);
      throw error; // Re-throw to let modal handle the error
    } finally {
      setIsScaling(false);
    }
  };

  // Build kebab menu actions with enhanced scaling option
  const actions = React.useMemo(() => {
    const items = [];
    const isTerminalState =
      status === PyTorchJobState.SUCCEEDED || status === PyTorchJobState.FAILED;

    // Add scale workers action (only when paused)
    if (isPaused) {
      items.push({
        title: (
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            spaceItems={{ default: 'spaceItemsSm' }}
          >
            <FlexItem>
              <Icon size="sm">
                <EditIcon />
              </Icon>
            </FlexItem>
            <FlexItem>Scale Workers</FlexItem>
          </Flex>
        ),
        onClick: () => setScaleWorkersModalOpen(true),
      });
    }

    // Add hibernation toggle action (but not for preempted or queued jobs)
    if (!isTerminalState && !isPreempted && !isQueued) {
      items.push({
        title: isPaused ? 'Resume' : 'Pause',
        onClick: () => setHibernationModalOpen(true),
      });
    }

    // Add delete action
    items.push({
      title: 'Delete',
      onClick: () => onDelete(job),
    });

    return items;
  }, [status, isPaused, isPreempted, isQueued, job, onDelete]);

  return (
    <>
      <Tr>
        <Td dataLabel="Name">
          <ResourceNameTooltip resource={job}>
            <Link to={`/modelTraining/${job.metadata.namespace}/${job.metadata.name}`}>
              {displayName}
            </Link>
          </ResourceNameTooltip>
        </Td>

        <Td dataLabel="Project">
          <TrainingJobProject trainingJob={job} />
        </Td>

        <Td dataLabel="Nodes">
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            spaceItems={{ default: 'spaceItemsSm' }}
          >
            <FlexItem>
              <Flex
                alignItems={{ default: 'alignItemsCenter' }}
                spaceItems={{ default: 'spaceItemsXs' }}
              >
                <FlexItem>
                  <CubesIcon />
                </FlexItem>
                <FlexItem>{nodesCount}</FlexItem>
              </Flex>
            </FlexItem>

            {/* Show scaling hint when paused */}
            {canScaleWorkers && (
              <FlexItem>
                <Tooltip content="Job is paused - click to scale worker replicas">
                  <Button
                    variant="link"
                    isInline
                    onClick={() => setScaleWorkersModalOpen(true)}
                    className="pf-u-p-0 pf-u-color-200"
                    aria-label="Scale workers"
                  >
                    <Icon size="sm" className="pf-u-color-100">
                      <EditIcon />
                    </Icon>
                  </Button>
                </Tooltip>
              </FlexItem>
            )}
          </Flex>
        </Td>
        <Td dataLabel="Cluster queue">
          <TrainingJobClusterQueue
            localQueueName={localQueueName}
            namespace={job.metadata.namespace}
          />
        </Td>
        <Td dataLabel="Created">
          {job.metadata.creationTimestamp ? (
            <Timestamp
              date={new Date(job.metadata.creationTimestamp)}
              tooltip={{
                variant: TimestampTooltipVariant.default,
              }}
            >
              {relativeTime(Date.now(), new Date(job.metadata.creationTimestamp).getTime())}
            </Timestamp>
          ) : (
            'Unknown'
          )}
        </Td>
        <Td dataLabel="Status">
          <TrainingJobStatus job={job} jobStatus={jobStatus} />
        </Td>
        <Td isActionCell>
          <ActionsColumn items={actions} />
        </Td>
      </Tr>

      <HibernationToggleModal
        job={hibernationModalOpen ? job : undefined}
        isPaused={isPaused}
        isToggling={isToggling}
        onClose={() => setHibernationModalOpen(false)}
        onConfirm={handleHibernationToggle}
      />

      {scaleWorkersModalOpen && (
        <ScaleWorkersModal
          job={job}
          jobStatus={status}
          isOpen
          onClose={() => setScaleWorkersModalOpen(false)}
          onConfirm={handleScaleWorkers}
          onConfirmAndResume={handleScaleWorkersAndResume}
          isLoading={isScaling}
        />
      )}
    </>
  );
};

export default TrainingJobTableRow;
