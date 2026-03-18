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
import { CubesIcon, PencilAltIcon } from '@patternfly/react-icons';
import { relativeTime } from '@odh-dashboard/internal/utilities/time';
import JobProject from './JobProject';
import TrainingJobClusterQueue from './TrainingJobClusterQueue';
import RayJobStatus from './components/RayJobStatus';
import StateActionToggle from './StateActionToggle';
import { getStatusFlags, getRayJobStatusSync } from './utils';
import { KUEUE_QUEUE_LABEL } from '../../const';
import { RayJobKind } from '../../k8sTypes';
import { JobDisplayState } from '../../types';
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
  isExternallyToggling?: boolean;
};

const RayJobTableRow: React.FC<RayJobTableRowProps> = ({
  job,
  jobStatus,
  isLoadingStatus,
  nodeCount,
  onDelete,
  onSelectJob,
  isExternallyToggling = false,
}) => {
  const displayName = job.metadata.name;
  const localQueueName = job.metadata.labels?.[KUEUE_QUEUE_LABEL];
  const { isPaused, canPauseResume } = getStatusFlags(jobStatus ?? getRayJobStatusSync(job));

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

  const rayClusterName = job.status?.rayClusterName || job.spec.clusterSelector?.['ray.io/cluster'];
  const { url: dashboardURL, loaded: urlLoaded } = useRayClusterDashboardURL(
    rayClusterName,
    job.metadata.namespace,
  );

  const actions = React.useMemo(() => {
    const items: React.ComponentProps<typeof ActionsColumn>['items'] = [];

    items.push(
      {
        title: 'View job details',
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
  }, [job, onDelete, onSelectJob]);

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
          {/* TODO RHOAIENG-52542: add onClick={() => setStatusModalOpen(true)} when modal is built */}
          <RayJobStatus job={job} jobStatus={jobStatus} isLoading={isLoadingStatus} />
        </Td>
        <Td>
          {canPauseResume && (
            <StateActionToggle
              isPaused={isPaused}
              onPause={() => undefined}
              onResume={() => undefined}
              isLoading={isExternallyToggling}
            />
          )}
        </Td>
        <Td isActionCell>
          <ActionsColumn items={actions} />
        </Td>
      </Tr>

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
