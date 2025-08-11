import * as React from 'react';
import { Tr, Td, ActionsColumn } from '@patternfly/react-table';
import { Label, Timestamp, Flex, FlexItem } from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import ResourceNameTooltip from '@odh-dashboard/internal/components/ResourceNameTooltip';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import TrainingJobProject from './TrainingJobProject';
import { getJobStatus } from './utils';
import TrainingJobClusterQueue from './TrainingJobClusterQueue';
import { PyTorchJobKind } from '../../k8sTypes';
import { PyTorchJobState } from '../../types';

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

const TrainingJobTableRow: React.FC<PyTorchJobTableRowProps> = ({ job, onDelete }) => {
  const status = getJobStatus(job);
  const displayName = getDisplayNameFromK8sResource(job);
  const workerReplicas = job.spec.pytorchReplicaSpecs.Worker?.replicas || 0;
  const localQueueName = job.metadata.labels?.['kueue.x-k8s.io/queue-name'];

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
              <FlexItem>{workerReplicas}</FlexItem>
            </Flex>
          </FlexItem>
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
          <Timestamp date={new Date(job.metadata.creationTimestamp)} />
        ) : (
          'Unknown'
        )}
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
