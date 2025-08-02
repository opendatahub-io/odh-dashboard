import * as React from 'react';
import { Tr, Td, ActionsColumn } from '@patternfly/react-table';
import { Label, Timestamp, Flex, FlexItem } from '@patternfly/react-core';
import { CubesIcon, UsersIcon, ClockIcon } from '@patternfly/react-icons';
import ResourceNameTooltip from '@odh-dashboard/internal/components/ResourceNameTooltip';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import { relativeDuration } from '@odh-dashboard/internal/utilities/time';
import { PyTorchJobKind } from '../../k8sTypes';
import { PyTorchJobState } from '../../types';
import { getJobStatus } from './utils';
import TrainingJobProject from './TrainingJobProject';

type PyTorchJobTableRowProps = {
  job: PyTorchJobKind;
  onDelete: (job: PyTorchJobKind) => void;
};

// Helper function to get status color
const getStatusColor = (
  status: PyTorchJobState,
): 'green' | 'red' | 'blue' | 'orange' | 'grey' | 'purple' => {
  switch (status) {
    case PyTorchJobState.SUCCEEDED:
      return 'green';
    case PyTorchJobState.FAILED:
      return 'red';
    case PyTorchJobState.RUNNING:
      return 'blue';
    case PyTorchJobState.PENDING:
      return 'orange';
    case PyTorchJobState.CREATED:
      return 'purple';
    default:
      return 'grey';
  }
};

// Helper function to format duration
const formatDuration = (startTime?: string, completionTime?: string): React.ReactNode => {
  if (!startTime) {
    return '-';
  }

  const start = new Date(startTime).getTime();
  if (Number.isNaN(start)) {
    return '-';
  }

  const end = completionTime ? new Date(completionTime).getTime() : Date.now();
  if (Number.isNaN(end)) {
    return '-';
  }

  const duration = end - start;
  if (duration <= 0) {
    return '-';
  }

  return (
    <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsXs' }}>
      <FlexItem>
        <ClockIcon />
      </FlexItem>
      <FlexItem>{relativeDuration(duration)}</FlexItem>
    </Flex>
  );
};

const TrainingJobTableRow: React.FC<PyTorchJobTableRowProps> = ({ job, onDelete }) => {
  const status = getJobStatus(job);
  const displayName = getDisplayNameFromK8sResource(job);
  const queueName = job.metadata.labels?.['kueue.x-k8s.io/queue-name'] || '-';
  const masterReplicas = job.spec.pytorchReplicaSpecs.Master?.replicas || 0;
  const workerReplicas = job.spec.pytorchReplicaSpecs.Worker?.replicas || 0;

  return (
    <Tr>
      <Td dataLabel="Name">
        <ResourceNameTooltip resource={job}>{displayName}</ResourceNameTooltip>
      </Td>
      <Td dataLabel="Project">
        <TrainingJobProject trainingJob={job} />
      </Td>
      <Td dataLabel="Master/Worker">
        <Flex alignItems={{ default: 'alignItemsCenter' }} spaceItems={{ default: 'spaceItemsSm' }}>
          <FlexItem>
            <Flex
              alignItems={{ default: 'alignItemsCenter' }}
              spaceItems={{ default: 'spaceItemsXs' }}
            >
              <FlexItem>
                <CubesIcon />
              </FlexItem>
              <FlexItem>{masterReplicas}</FlexItem>
            </Flex>
          </FlexItem>
          <FlexItem>/</FlexItem>
          <FlexItem>
            <Flex
              alignItems={{ default: 'alignItemsCenter' }}
              spaceItems={{ default: 'spaceItemsXs' }}
            >
              <FlexItem>
                <UsersIcon />
              </FlexItem>
              <FlexItem>{workerReplicas}</FlexItem>
            </Flex>
          </FlexItem>
        </Flex>
      </Td>
      <Td dataLabel="Queue">{queueName}</Td>
      <Td dataLabel="Created">
        {job.metadata.creationTimestamp ? (
          <Timestamp date={new Date(job.metadata.creationTimestamp)} />
        ) : (
          'Unknown'
        )}
      </Td>
      <Td dataLabel="Duration">
        {formatDuration(job.status?.startTime, job.status?.completionTime)}
      </Td>
      <Td dataLabel="Status">
        <Label color={getStatusColor(status)}>{status}</Label>
      </Td>
      <Td isActionCell>
        <ActionsColumn
          items={[
            {
              title: 'Delete',
              onClick: () => {
                onDelete(job);
              },
            },
          ]}
        />
      </Td>
    </Tr>
  );
};

export default TrainingJobTableRow;
