import * as React from 'react';
import { Tr, Td, ActionsColumn } from '@patternfly/react-table';
import {
  Timestamp,
  Flex,
  FlexItem,
  TimestampTooltipVariant,
  Button,
  Skeleton,
  Tooltip,
} from '@patternfly/react-core';
import { CubesIcon, ExternalLinkAltIcon, PencilAltIcon } from '@patternfly/react-icons';
import { relativeTime } from '@odh-dashboard/internal/utilities/time';
import JobProject from './JobProject';
import TrainingJobClusterQueue from './TrainingJobClusterQueue';
import RayJobStatus from './components/RayJobStatus';
import RayJobStatusModal from './RayJobStatusModal';
import StateActionToggle from './StateActionToggle';
import { getStatusFlags, getRayJobStatusSync } from './utils';
import PauseRayJobModal from './PauseRayJobModal';
import { useRayJobPauseResume } from './hooks/useRayJobPauseResume';
import {
  KUEUE_QUEUE_LABEL,
  PAUSE_RAY_JOB_TOOLTIP_CONTENT,
  RAY_CLUSTER_SELECTOR_LABEL,
} from '../../const';
import { RayJobKind } from '../../k8sTypes';
import { JobDisplayState, RayJobState } from '../../types';
import { useRayClusterDashboardURL } from '../../hooks/useRayClusterDashboardURL';
import { useRayJobNodeScaling } from '../../hooks/useRayJobNodeScaling';
import ScaleRayJobNodesModal from '../rayJobDetailsDrawer/ScaleRayJobNodesModal';

type RayJobTableRowProps = {
  job: RayJobKind;
  jobStatus?: JobDisplayState;
  isLoadingStatus?: boolean;
  nodeCount: number;
  onDelete: (job: RayJobKind) => void;
  onSelectJob: (job: RayJobKind) => void;
  onStatusUpdate?: (jobId: string, newStatus: RayJobState) => void;
  isExternallyToggling?: boolean;
};

const RayJobTableRow: React.FC<RayJobTableRowProps> = ({
  job,
  jobStatus,
  isLoadingStatus,
  nodeCount,
  onDelete,
  onSelectJob,
  onStatusUpdate,
  isExternallyToggling = false,
}) => {
  const displayName = job.metadata.name;
  const localQueueName = job.metadata.labels?.[KUEUE_QUEUE_LABEL];
  const { isPaused, canPauseResume } = getStatusFlags(jobStatus ?? getRayJobStatusSync(job));
  const isClusterSelectorJob = !!job.spec.clusterSelector?.[RAY_CLUSTER_SELECTOR_LABEL];
  const [statusModalOpen, setStatusModalOpen] = React.useState(false);

  const {
    workerGroupReplicas,
    setWorkerGroupReplicas,
    hasChanges,
    canEditNodes,
    isScaling,
    modalOpen,
    setModalOpen,
    handleSave,
  } = useRayJobNodeScaling(job, jobStatus);

  const {
    isSubmitting,
    pauseModalOpen,
    closePauseModal,
    onPauseClick,
    handlePause,
    handleResume,
    dontShowModalValue,
    setDontShowModalValue,
  } = useRayJobPauseResume(job, onStatusUpdate);

  const rayClusterName = job.status?.rayClusterName || job.spec.clusterSelector?.['ray.io/cluster'];
  const { url: dashboardURL, loaded: urlLoaded } = useRayClusterDashboardURL(
    rayClusterName,
    job.metadata.namespace,
  );

  const actions = React.useMemo(() => {
    const items: React.ComponentProps<typeof ActionsColumn>['items'] = [];

    if (canEditNodes) {
      items.push({
        title: 'Edit node count',
        onClick: () => setModalOpen(true),
      });
    }

    if (canPauseResume) {
      items.push({
        title: isPaused ? 'Resume job' : 'Pause job',
        isDisabled: isSubmitting || isExternallyToggling,
        isAriaDisabled: isClusterSelectorJob,
        ...(isClusterSelectorJob && {
          tooltipProps: {
            content: PAUSE_RAY_JOB_TOOLTIP_CONTENT,
          },
        }),
        onClick: isClusterSelectorJob ? undefined : isPaused ? handleResume : onPauseClick,
      });
    }

    items.push(
      {
        title: 'View more details',
        onClick: () => onSelectJob(job),
      },
      {
        isSeparator: true,
      },
      {
        title: 'Delete job',
        onClick: () => onDelete(job),
      },
    );

    return items;
  }, [
    canPauseResume,
    isPaused,
    handleResume,
    onPauseClick,
    isSubmitting,
    isExternallyToggling,
    isClusterSelectorJob,
    canEditNodes,
    setModalOpen,
    job,
    onSelectJob,
    onDelete,
  ]);

  const renderRayClusterCell = () => {
    if (!rayClusterName) {
      return '-';
    }
    if (!urlLoaded) {
      return <Skeleton width="100px" />;
    }
    if (dashboardURL) {
      return (
        <Button
          variant="link"
          isInline
          component="a"
          href={dashboardURL}
          target="_blank"
          rel="noopener noreferrer"
          icon={<ExternalLinkAltIcon />}
          iconPosition="end"
        >
          {rayClusterName}
        </Button>
      );
    }
    return rayClusterName;
  };

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
                <FlexItem>{nodeCount}</FlexItem>
              </Flex>
            </FlexItem>
            {canEditNodes && (
              <FlexItem>
                <Tooltip content="Edit node count">
                  <Button
                    variant="link"
                    isInline
                    aria-label="Edit node count"
                    data-testid="edit-node-count-button"
                    icon={<PencilAltIcon />}
                    onClick={() => setModalOpen(true)}
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
        <Td dataLabel="Ray cluster">{renderRayClusterCell()}</Td>
        <Td dataLabel="Type">RayJob</Td>
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
          <RayJobStatus
            job={job}
            jobStatus={jobStatus}
            isLoading={isLoadingStatus}
            onClick={() => setStatusModalOpen(true)}
          />
        </Td>
        <Td>
          {canPauseResume && (
            <Tooltip
              content={PAUSE_RAY_JOB_TOOLTIP_CONTENT}
              trigger={isClusterSelectorJob ? 'mouseenter focus' : ''}
              aria={isClusterSelectorJob ? 'describedby' : 'none'}
            >
              <span>
                <StateActionToggle
                  isPaused={isPaused}
                  onPause={onPauseClick}
                  onResume={handleResume}
                  isLoading={isSubmitting || isExternallyToggling}
                  isDisabled={isClusterSelectorJob}
                />
              </span>
            </Tooltip>
          )}
        </Td>
        <Td isActionCell>
          <ActionsColumn items={actions} />
        </Td>
      </Tr>

      {pauseModalOpen && (
        <PauseRayJobModal
          job={job}
          isPausing={isSubmitting}
          onClose={closePauseModal}
          onConfirm={handlePause}
          dontShowModalValue={dontShowModalValue}
          setDontShowModalValue={setDontShowModalValue}
        />
      )}

      {statusModalOpen && (
        <RayJobStatusModal
          job={job}
          jobStatus={jobStatus}
          onClose={() => setStatusModalOpen(false)}
          onDelete={() => {
            setStatusModalOpen(false);
            onDelete(job);
          }}
          onPauseClick={() => {
            setStatusModalOpen(false);
            onPauseClick();
          }}
          onResumeClick={() => {
            setStatusModalOpen(false);
            handleResume();
          }}
          isToggling={isSubmitting}
          isPauseDisabled={isClusterSelectorJob}
        />
      )}

      {modalOpen && (
        <ScaleRayJobNodesModal
          jobName={job.metadata.name}
          workerGroupReplicas={workerGroupReplicas}
          hasChanges={hasChanges}
          isScaling={isScaling}
          onClose={() => setModalOpen(false)}
          onSave={handleSave}
          onReplicaChange={(groupName, newReplicas) =>
            setWorkerGroupReplicas((prev) =>
              prev.map((wg) =>
                wg.groupName === groupName ? { ...wg, replicas: newReplicas } : wg,
              ),
            )
          }
        />
      )}
    </>
  );
};

export default RayJobTableRow;
