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
import TrainingJobProject from './TrainingJobProject';
import { getTrainingJobStatusSync, getStatusFlags } from './utils';
import TrainingJobClusterQueue from './TrainingJobClusterQueue';
import PauseTrainingJobModal from './PauseTrainingJobModal';
import ScaleNodesModal from './ScaleNodesModal';
import TrainingJobStatus from './components/TrainingJobStatus';
import TrainingJobStatusModal from './TrainingJobStatusModal';
import StateActionToggle from './StateActionToggle';
import { useTrainingJobPauseResume } from './hooks/useTrainingJobPauseResume';
import { TrainJobKind } from '../../k8sTypes';
import { TrainingJobState } from '../../types';
import { useTrainingJobNodeScaling } from '../../hooks/useTrainingJobNodeScaling';

type TrainingJobTableRowProps = {
  job: TrainJobKind;
  jobStatus?: TrainingJobState;
  onDelete: (job: TrainJobKind) => void;
  onStatusUpdate?: (jobId: string, newStatus: TrainingJobState) => void;
  onSelectJob: (job: TrainJobKind) => void;
  isExternallyToggling?: boolean;
};

const TrainingJobTableRow: React.FC<TrainingJobTableRowProps> = ({
  job,
  jobStatus,
  onDelete,
  onStatusUpdate,
  onSelectJob,
  isExternallyToggling = false,
}) => {
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

  const localQueueName = job.metadata.labels?.['kueue.x-k8s.io/queue-name'];

  const status = jobStatus || getTrainingJobStatusSync(job);

  const { isPaused, canPauseResume } = getStatusFlags(status);

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

    // 2. Pause/Resume job (only when allowed)
    if (canPauseResume) {
      items.push({
        title: isPaused ? 'Resume job' : 'Pause job',
        onClick: isPaused ? handleResume : onPauseClick,
      });
    }

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
  }, [
    canScaleNodes,
    canPauseResume,
    isPaused,
    job,
    onDelete,
    onSelectJob,
    setScaleNodesModalOpen,
    handleResume,
    onPauseClick,
  ]);

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

      {scaleNodesModalOpen && (
        <ScaleNodesModal
          job={job}
          currentNodeCount={nodesCount}
          isScaling={isScaling}
          onClose={() => setScaleNodesModalOpen(false)}
          onConfirm={handleScaleNodes}
        />
      )}
    </>
  );
};

export default TrainingJobTableRow;
