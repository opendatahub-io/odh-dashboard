import * as React from 'react';
import { Tr, Td, ActionsColumn } from '@patternfly/react-table';
import { Timestamp, Flex, FlexItem, TimestampTooltipVariant, Button } from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import { relativeTime } from '@odh-dashboard/internal/utilities/time';
import useNotification from '@odh-dashboard/internal/utilities/useNotification';
import TrainingJobProject from './TrainingJobProject';
import { getTrainingJobStatusSync } from './utils';
import TrainingJobClusterQueue from './TrainingJobClusterQueue';
import HibernationToggleModal from './HibernationToggleModal';
import TrainingJobStatus from './components/TrainingJobStatus';
import StateActionToggle from './StateActionToggle';
import { TrainJobKind } from '../../k8sTypes';
import { TrainingJobState } from '../../types';
import { toggleTrainJobHibernation } from '../../api';

type TrainingJobTableRowProps = {
  job: TrainJobKind;
  jobStatus?: TrainingJobState;
  onDelete: (job: TrainJobKind) => void;
  onStatusUpdate?: (jobId: string, newStatus: TrainingJobState) => void;
  onSelectJob: (job: TrainJobKind) => void;
};

const TrainingJobTableRow: React.FC<TrainingJobTableRowProps> = ({
  job,
  jobStatus,
  onDelete,
  onStatusUpdate,
  onSelectJob,
}) => {
  const notification = useNotification();
  const [hibernationModalOpen, setHibernationModalOpen] = React.useState(false);
  const [isToggling, setIsToggling] = React.useState(false);

  const displayName = getDisplayNameFromK8sResource(job);
  const nodesCount = job.spec.trainer.numNodes || 0;
  const localQueueName = job.metadata.labels?.['kueue.x-k8s.io/queue-name'];

  const status = jobStatus || getTrainingJobStatusSync(job);
  const isPaused = status === TrainingJobState.PAUSED;
  const isPreempted = status === TrainingJobState.PREEMPTED;
  const isQueued = status === TrainingJobState.QUEUED;
  const isRunning = status === TrainingJobState.RUNNING;
  const isPending = status === TrainingJobState.PENDING;

  const handleHibernationToggle = async () => {
    setIsToggling(true);
    try {
      const result = await toggleTrainJobHibernation(job);
      if (result.success) {
        // Update status optimistically based on current state
        const newStatus = isPaused ? TrainingJobState.RUNNING : TrainingJobState.PAUSED;
        const jobId = job.metadata.uid || job.metadata.name;
        onStatusUpdate?.(jobId, newStatus);
      } else {
        console.error('Failed to toggle hibernation:', result.error);
        //Show error notification
        notification.error(
          'Failed to toggle hibernation',
          result.error || 'Unknown error occurred',
        );
      }
    } catch (error) {
      console.error('Error toggling hibernation:', error);
      //Show error notification
      notification.error(
        'Failed to toggle hibernation',
        error instanceof Error ? error.message : 'Unknown error occurred',
      );
    } finally {
      setIsToggling(false);
      setHibernationModalOpen(false);
    }
  };

  // Build kebab menu actions with enhanced scaling option
  const actions = React.useMemo(() => {
    const items = [];

    // Add delete action
    items.push({
      title: 'Delete',
      onClick: () => onDelete(job),
    });

    return items;
  }, [status, isPaused, isPreempted, isQueued, isRunning, isPending, job, onDelete]);

  return (
    <>
      <Tr>
        <Td dataLabel="Name">
          <Button variant="link" isInline onClick={() => onSelectJob(job)}>
            {displayName}
          </Button>
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
            {/* Show scaling hint when scaling is available */}
            {/* TODO: RHOAIENG-37576 Uncomment this when scaling is implemented */}
            {/* {(isNotPaused || canScaleNodes) && (
              <FlexItem>
                <Tooltip content="Click to scale nodes">
                  <Button
                    variant="link"
                    isInline
                    onClick={() => setScaleNodesModalOpen(true)}
                    className="pf-u-p-0 pf-u-color-200"
                    aria-label="Scale nodes"
                  >
                    <Icon size="sm" className="pf-u-color-100">
                      <EditIcon />
                    </Icon>
                  </Button>
                </Tooltip>
              </FlexItem>
            )} */}
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
        <Td>
          {(isRunning || isPaused) && (
            <StateActionToggle
              isPaused={isPaused}
              onPause={() => setHibernationModalOpen(true)}
              onResume={() => setHibernationModalOpen(true)}
              isLoading={isToggling}
            />
          )}
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
    </>
  );
};

export default TrainingJobTableRow;
