import * as React from 'react';
import { Tr, Td, ActionsColumn } from '@patternfly/react-table';
import { Timestamp, Flex, FlexItem, TimestampTooltipVariant } from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import ResourceNameTooltip from '@odh-dashboard/internal/components/ResourceNameTooltip';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/internal/concepts/k8s/utils';
import { relativeTime } from '@odh-dashboard/internal/utilities/time';
import TrainingJobProject from './TrainingJobProject';
import { getJobStatusFromPyTorchJob } from './utils';
import TrainingJobClusterQueue from './TrainingJobClusterQueue';
import HibernationToggleModal from './HibernationToggleModal';
import TrainingJobStatus from './components/TrainingJobStatus';
import { PyTorchJobKind } from '../../k8sTypes';
import { PyTorchJobState } from '../../types';
import { togglePyTorchJobHibernation } from '../../api';

type PyTorchJobTableRowProps = {
  job: PyTorchJobKind;
  jobStatus?: PyTorchJobState;
  onDelete: (job: PyTorchJobKind) => void;
  onStatusUpdate?: (jobId: string, newStatus: PyTorchJobState) => void;
};

const TrainingJobTableRow: React.FC<PyTorchJobTableRowProps> = ({
  job,
  jobStatus,
  onDelete,
  onStatusUpdate,
}) => {
  const [hibernationModalOpen, setHibernationModalOpen] = React.useState(false);
  const [isToggling, setIsToggling] = React.useState(false);

  const displayName = getDisplayNameFromK8sResource(job);
  const workerReplicas = job.spec.pytorchReplicaSpecs.Worker?.replicas || 0;
  const localQueueName = job.metadata.labels?.['kueue.x-k8s.io/queue-name'];

  const status = jobStatus || getJobStatusFromPyTorchJob(job);
  const isSuspended = status === PyTorchJobState.SUSPENDED;

  const handleHibernationToggle = async () => {
    setIsToggling(true);
    try {
      const result = await togglePyTorchJobHibernation(job);
      if (result.success) {
        // Update status optimistically
        const newStatus = isSuspended ? PyTorchJobState.RUNNING : PyTorchJobState.SUSPENDED;
        const jobId = job.metadata.uid || job.metadata.name;
        onStatusUpdate?.(jobId, newStatus);
      } else {
        console.error('Failed to toggle hibernation:', result.error);
        // TODO: Show error notification
      }
    } catch (error) {
      console.error('Error toggling hibernation:', error);
      // TODO: Show error notification
    } finally {
      setIsToggling(false);
      setHibernationModalOpen(false);
    }
  };

  // Build kebab menu actions
  const actions = React.useMemo(() => {
    const items = [];

    // Add hibernation toggle action
    const isTerminalState =
      status === PyTorchJobState.SUCCEEDED || status === PyTorchJobState.FAILED;

    if (!isTerminalState) {
      items.push({
        title: isSuspended ? 'Resume' : 'Suspend',
        onClick: () => setHibernationModalOpen(true),
      });
    }

    // Add delete action
    items.push({
      title: 'Delete',
      onClick: () => onDelete(job),
    });

    return items;
  }, [status, isSuspended, job, onDelete]);

  return (
    <>
      <Tr>
        <Td dataLabel="Name">
          <ResourceNameTooltip resource={job}>
            <Link to={`/modelTraining/${job.metadata.namespace}/${job.metadata.name}`}>
              {displayName}
            </Link>
          </ResourceNameTooltip>
        </Td>

        <Td dataLabel="Project">
          <TrainingJobProject trainingJob={job} />
        </Td>

        <Td dataLabel="Worker nodes">
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
        <Td isActionCell>
          <ActionsColumn items={actions} />
        </Td>
      </Tr>

      <HibernationToggleModal
        job={hibernationModalOpen ? job : undefined}
        isSuspended={isSuspended}
        isToggling={isToggling}
        onClose={() => setHibernationModalOpen(false)}
        onConfirm={handleHibernationToggle}
      />
    </>
  );
};

export default TrainingJobTableRow;
