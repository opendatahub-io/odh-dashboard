import * as React from 'react';
import { Tr, Td, ActionsColumn } from '@patternfly/react-table';
import { Timestamp, Flex, FlexItem, TimestampTooltipVariant, Button } from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import { relativeTime } from '@odh-dashboard/ui-core/utilities/time';
import JobProject from './JobProject';
import { getTrainingJobStatusSync, getStatusFlags } from './utils';
import TrainingJobClusterQueue from './TrainingJobClusterQueue';
import PauseTrainingJobModal from './PauseTrainingJobModal';
import TrainingJobStatus from './components/TrainingJobStatus';
import TrainingJobStatusModal from './TrainingJobStatusModal';
import StateActionToggle from './StateActionToggle';
import { useTrainingJobPauseResume } from './hooks/useTrainingJobPauseResume';
import { TrainJobKind } from '../../k8sTypes';
import { JobDisplayState, TrainingJobState } from '../../types';
import { KUEUE_QUEUE_LABEL } from '../../const';
import { useTrainingJobNodeScaling } from '../../hooks/useTrainingJobNodeScaling';

type TrainJobTableRowProps = {
  job: TrainJobKind;
  jobStatus?: JobDisplayState;
  onDelete: (job: TrainJobKind) => void;
  onStatusUpdate?: (jobId: string, newStatus: TrainingJobState) => void;
  onSelectJob: (job: TrainJobKind) => void;
  isExternallyToggling?: boolean;
};

const TrainJobTableRow: React.FC<TrainJobTableRowProps> = ({
  job,
  jobStatus,
  onDelete,
  onStatusUpdate,
  onSelectJob,
  isExternallyToggling = false,
}) => {
  const [statusModalOpen, setStatusModalOpen] = React.useState(false);

  const displayName = getDisplayNameFromK8sResource(job);

  // Use custom hook to resolve the node count for display
  const { nodesCount } = useTrainingJobNodeScaling(job);

  // Use custom hook for pause/resume functionality
  const {
    isToggling,
    pauseModalOpen,
    closePauseModal,
    onPauseClick,
    handlePause,
    handleResume,
    dontShowModalValue,
    setDontShowModalValue,
  } = useTrainingJobPauseResume(job, onStatusUpdate);

  const localQueueName = job.metadata.labels?.[KUEUE_QUEUE_LABEL];

  const status = jobStatus || getTrainingJobStatusSync(job);

  const { isPaused, canPauseResume } = getStatusFlags(status);

  // Build kebab menu actions
  const actions = React.useMemo(() => {
    const items: React.ComponentProps<typeof ActionsColumn>['items'] = [];

    // 1. Pause/Resume job (only when allowed)
    if (canPauseResume) {
      items.push({
        title: isPaused ? 'Resume job' : 'Pause job',
        onClick: isPaused ? handleResume : onPauseClick,
      });
    }

    // 2. View more details
    items.push({
      title: 'View more details',
      onClick: () => onSelectJob(job),
    });

    // Separator before delete
    items.push({
      isSeparator: true,
    });

    // 3. Delete job
    items.push({
      title: 'Delete job',
      onClick: () => onDelete(job),
    });

    return items;
  }, [canPauseResume, isPaused, job, onDelete, onSelectJob, handleResume, onPauseClick]);

  return (
    <>
      <Tr>
        <Td dataLabel="Name">
          <Button variant="link" isInline onClick={() => onSelectJob(job)}>
            {displayName}
          </Button>
        </Td>
        <Td dataLabel="Project">
          <JobProject job={job} />
        </Td>
        <Td dataLabel="Nodes">
          <Flex
            alignItems={{ default: 'alignItemsCenter' }}
            spaceItems={{ default: 'spaceItemsXs' }}
          >
            <FlexItem>
              <CubesIcon />
            </FlexItem>
            <FlexItem>{nodesCount}</FlexItem>
          </Flex>
        </Td>
        <Td dataLabel="Cluster queue">
          <TrainingJobClusterQueue
            localQueueName={localQueueName}
            namespace={job.metadata.namespace}
          />
        </Td>
        <Td dataLabel="Ray cluster">-</Td>
        <Td dataLabel="Type">TrainJob</Td>
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
        <Td>
          {canPauseResume && (
            <StateActionToggle
              isPaused={isPaused}
              onPause={onPauseClick}
              onResume={handleResume}
              isLoading={isToggling || isExternallyToggling}
            />
          )}
        </Td>
        <Td isActionCell>
          <ActionsColumn items={actions} />
        </Td>
      </Tr>

      {pauseModalOpen && (
        <PauseTrainingJobModal
          job={job}
          isPausing={isToggling}
          onClose={closePauseModal}
          onConfirm={handlePause}
          dontShowModalValue={dontShowModalValue}
          setDontShowModalValue={setDontShowModalValue}
        />
      )}
      {statusModalOpen && (
        <TrainingJobStatusModal
          job={job}
          jobStatus={jobStatus}
          onClose={() => setStatusModalOpen(false)}
          onDelete={() => {
            setStatusModalOpen(false);
            onDelete(job);
          }}
          onPauseClick={onPauseClick}
          onResumeClick={handleResume}
          isToggling={isToggling}
        />
      )}
    </>
  );
};

export default TrainJobTableRow;
