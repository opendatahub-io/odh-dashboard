/* TODO: RHOAIENG-37577 Retry and Pause/Resume actions are currently blocked by backend*/
import * as React from 'react';
import { Tr, Td, ActionsColumn } from '@patternfly/react-table';
import {
  Timestamp,
  Flex,
  FlexItem,
  TimestampTooltipVariant,
  Button,
  Tooltip,
} from '@patternfly/react-core';
import { CubesIcon, PencilAltIcon } from '@patternfly/react-icons';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import { relativeTime } from '@odh-dashboard/internal/utilities/time';
import useNotification from '@odh-dashboard/internal/utilities/useNotification';
import TrainingJobProject from './TrainingJobProject';
import { getTrainingJobStatusSync, getStatusFlags } from './utils';
import TrainingJobClusterQueue from './TrainingJobClusterQueue';
import HibernationToggleModal from './HibernationToggleModal';
import ScaleNodesModal from './ScaleNodesModal';
import TrainingJobStatus from './components/TrainingJobStatus';
import TrainingJobStatusModal from './TrainingJobStatusModal';
import { TrainJobKind } from '../../k8sTypes';
import { TrainingJobState } from '../../types';
import { toggleTrainJobHibernation } from '../../api';
import { useTrainingJobNodeScaling } from '../../hooks/useTrainingJobNodeScaling';

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
  const [statusModalOpen, setStatusModalOpen] = React.useState(false);

  const displayName = getDisplayNameFromK8sResource(job);

  // Use custom hook for node scaling functionality
  const {
    nodesCount,
    canScaleNodes,
    isScaling,
    scaleNodesModalOpen,
    setScaleNodesModalOpen,
    handleScaleNodes,
  } = useTrainingJobNodeScaling(job, jobStatus);

  const localQueueName = job.metadata.labels?.['kueue.x-k8s.io/queue-name'];

  const status = jobStatus || getTrainingJobStatusSync(job);

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

  const { isPaused } = getStatusFlags(status);

  // Build kebab menu actions
  const actions = React.useMemo(() => {
    const items: React.ComponentProps<typeof ActionsColumn>['items'] = [];

    // 1. Edit node count (only when allowed)
    if (canScaleNodes) {
      items.push({
        title: 'Edit node count',
        onClick: () => setScaleNodesModalOpen(true),
      });
    }

    // TODO: RHOAIENG-37577 Pause/Resume action is currently blocked by backend
    // 2. Pause/Resume job (only when allowed)
    // if (canPauseResume) {
    //   items.push({
    //     title: isPaused ? 'Resume job' : 'Pause job',
    //     onClick: () => setHibernationModalOpen(true),
    //   });
    // }

    // 3. View more details
    items.push({
      title: 'View more details',
      onClick: () => onSelectJob(job),
    });

    // Separator before delete
    items.push({
      isSeparator: true,
    });

    // 4. Delete job
    items.push({
      title: 'Delete job',
      onClick: () => onDelete(job),
    });

    return items;
  }, [canScaleNodes, job, onDelete, onSelectJob, setScaleNodesModalOpen]);

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
            {canScaleNodes && (
              <FlexItem>
                <Tooltip content="Click to scale nodes">
                  <Button
                    variant="link"
                    isInline
                    onClick={() => setScaleNodesModalOpen(true)}
                    className="pf-u-p-0 pf-u-color-200"
                    aria-label="Scale nodes"
                    icon={<PencilAltIcon />}
                    style={{ fontSize: 'inherit', padding: 0 }}
                    isDisabled={!canScaleNodes}
                  />
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
          <TrainingJobStatus
            job={job}
            jobStatus={jobStatus}
            onClick={() => setStatusModalOpen(true)}
          />
        </Td>
        {/* TODO: RHOAIENG-37577 Pause/Resume action is currently blocked by backend*/}
        {/* <Td>
          {canPauseResume && (
            <StateActionToggle
              isPaused={isPaused}
              onPause={() => setHibernationModalOpen(true)}
              onResume={() => setHibernationModalOpen(true)}
              isLoading={isToggling}
            />
          )}
        </Td> */}
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
      {statusModalOpen && (
        <TrainingJobStatusModal
          job={job}
          jobStatus={jobStatus}
          onClose={() => setStatusModalOpen(false)}
          // onPause={() => {
          //   setStatusModalOpen(false);
          //   setHibernationModalOpen(true);
          // }}
          onDelete={() => {
            setStatusModalOpen(false);
            onDelete(job);
          }}
        />
      )}

      <ScaleNodesModal
        job={scaleNodesModalOpen ? job : undefined}
        currentNodeCount={nodesCount}
        isScaling={isScaling}
        onClose={() => setScaleNodesModalOpen(false)}
        onConfirm={handleScaleNodes}
      />
    </>
  );
};

export default TrainingJobTableRow;
