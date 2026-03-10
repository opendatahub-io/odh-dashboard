import * as React from 'react';
import { Tr, Td, ActionsColumn } from '@patternfly/react-table';
import {
  Timestamp,
  Flex,
  FlexItem,
  TimestampTooltipVariant,
  Button,
  Skeleton,
} from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import { relativeTime } from '@odh-dashboard/internal/utilities/time';
import JobProject from './JobProject';
import TrainingJobClusterQueue from './TrainingJobClusterQueue';
import { getRayJobStatusSync, getStatusInfo, getStatusFlags } from './utils';
import StateActionToggle from './StateActionToggle';
import { KUEUE_QUEUE_LABEL } from '../../const';
import { RayJobKind } from '../../k8sTypes';
import { TrainingJobState } from '../../types';
import { useRayClusterDashboardURL } from '../../hooks/useRayClusterDashboardURL';

type RayJobTableRowProps = {
  job: RayJobKind;
  jobStatus?: TrainingJobState;
  nodeCount: number;
  onDelete: (job: RayJobKind) => void;
  onSelectJob: (job: RayJobKind) => void;
  isExternallyToggling?: boolean;
};

const RayJobTableRow: React.FC<RayJobTableRowProps> = ({
  job,
  jobStatus,
  nodeCount,
  onDelete,
  onSelectJob,
  isExternallyToggling = false,
}) => {
  const displayName = job.metadata.name;
  const localQueueName = job.metadata.labels?.[KUEUE_QUEUE_LABEL];
  const status = jobStatus || getRayJobStatusSync(job);
  const statusInfo = getStatusInfo(status);
  const { isPaused, canPauseResume } = getStatusFlags(status);

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
        <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsXs' }}>
          <FlexItem>
            <CubesIcon />
          </FlexItem>
          <FlexItem>{nodeCount}</FlexItem>
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
        <statusInfo.IconComponent /> {statusInfo.label}
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
  );
};

export default RayJobTableRow;
