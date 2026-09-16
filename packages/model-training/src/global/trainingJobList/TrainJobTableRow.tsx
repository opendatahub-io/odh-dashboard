import * as React from 'react';
import { Tr, Td, ActionsColumn } from '@patternfly/react-table';
import {
  Timestamp,
  Flex,
  FlexItem,
  TimestampTooltipVariant,
  Button,
  // RHOAIENG-88673: only used by the disabled scale affordance
  // Tooltip,
} from '@patternfly/react-core';
// RHOAIENG-88673: PencilAltIcon only used by the disabled scale affordance
import { CubesIcon } from '@patternfly/react-icons';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import { relativeTime } from '@odh-dashboard/ui-core/utilities/time';
import JobProject from './JobProject';
import { getTrainingJobStatusSync, getStatusFlags } from './utils';
import TrainingJobClusterQueue from './TrainingJobClusterQueue';
import PauseTrainingJobModal from './PauseTrainingJobModal';
// RHOAIENG-88673: scale flow disabled - see note at the hook call below
// import ScaleNodesModal from './ScaleNodesModal';
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

  // Use custom hook for node scaling functionality
  // RHOAIENG-88673: TrainJob node scaling disabled for RHOAI 3.6 - Kubeflow Trainer 2.2
  // made `spec.trainer` immutable (kubeflow/trainer#3157), so the numNodes PATCH is rejected
  // by the TrainJob validating webhook. Uncomment once upstream supports post-create scaling.
  const {
    nodesCount,
    // canScaleNodes,
    // isScaling,
    // scaleNodesModalOpen,
    // setScaleNodesModalOpen,
    // handleScaleNodes,
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

  const localQueueName = job.metadata.labels?.[KUEUE_QUEUE_LABEL];

  const status = jobStatus || getTrainingJobStatusSync(job);

  const { isPaused, canPauseResume } = getStatusFlags(status);

  // Build kebab menu actions
  const actions = React.useMemo(() => {
    const items: React.ComponentProps<typeof ActionsColumn>['items'] = [];

    // 1. Edit node count (only when allowed) - RHOAIENG-88673: disabled, see note above
    // if (canScaleNodes) {
    //   items.push({
    //     title: <span data-testid="edit-node-count-action">Edit node count</span>,
    //     onClick: () => setScaleNodesModalOpen(true),
    //   });
    // }

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
    // canScaleNodes,
    canPauseResume,
    isPaused,
    job,
    onDelete,
    onSelectJob,
    // setScaleNodesModalOpen,
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
          <JobProject job={job} />
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
            {/* RHOAIENG-88673: inline scale affordance disabled - see note above
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
            */}
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

      {/* RHOAIENG-88673: scale modal disabled - see note above
      {scaleNodesModalOpen && (
        <ScaleNodesModal
          job={job}
          currentNodeCount={nodesCount}
          isScaling={isScaling}
          onClose={() => setScaleNodesModalOpen(false)}
          onConfirm={handleScaleNodes}
        />
      )}
      */}
    </>
  );
};

export default TrainJobTableRow;
