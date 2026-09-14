/* eslint-disable @odh-dashboard/no-restricted-imports */
import * as React from 'react';
import { Tr, Td } from '@patternfly/react-table';
import { Content, ContentVariants } from '@patternfly/react-core';
/* eslint-enable @odh-dashboard/no-restricted-imports */
import { toOrdinal } from '@odh-dashboard/k8s-core/kueue/messageUtils';
import ClusterQueueWorkloadStatusLabel from './ClusterQueueWorkloadStatusLabel';
import { QUOTA_USAGE_STATUSES_PAST_ADMISSION, type ClusterQueueWorkloadRow } from '../../types';

const UNAVAILABLE_VALUE = '--';

const formatAccelerators = (count: number): string => (count === 1 ? '1 GPU' : `${count} GPUs`);

const formatQueuePosition = (
  position: number | undefined,
  status: ClusterQueueWorkloadRow['status'],
): string => {
  if (QUOTA_USAGE_STATUSES_PAST_ADMISSION.includes(status) || position == null) {
    return UNAVAILABLE_VALUE;
  }
  return toOrdinal(position);
};

const formatOptionalValue = (value: string | undefined): string => value ?? UNAVAILABLE_VALUE;

const HardwareProfileCell: React.FC<{
  hardwareProfile: string | undefined;
  hardwareProfileResourceType: string | undefined;
}> = ({ hardwareProfile, hardwareProfileResourceType }) => {
  if (!hardwareProfile) {
    return <>{UNAVAILABLE_VALUE}</>;
  }
  return (
    <>
      <Content component={ContentVariants.p}>{hardwareProfile}</Content>
      {hardwareProfileResourceType && (
        <Content component={ContentVariants.small}>{hardwareProfileResourceType}</Content>
      )}
    </>
  );
};

type ClusterQueueWorkloadTableRowProps = {
  workload: ClusterQueueWorkloadRow;
  showClusterQueue?: boolean;
};

const ClusterQueueWorkloadTableRow: React.FC<ClusterQueueWorkloadTableRowProps> = ({
  workload,
  showClusterQueue = false,
}) => (
  <Tr
    key={`${workload.namespace}/${workload.name}`}
    data-testid={`cluster-queue-workload-row-${workload.namespace}-${workload.name}`}
  >
    {showClusterQueue && <Td dataLabel="Cluster queue">{workload.clusterQueue}</Td>}
    <Td dataLabel="Name">{workload.name}</Td>
    <Td dataLabel="Project">{workload.project}</Td>
    <Td dataLabel="Type">{workload.type}</Td>
    <Td dataLabel="Status">
      <ClusterQueueWorkloadStatusLabel status={workload.status} />
    </Td>
    <Td dataLabel="Local queue">{workload.localQueue}</Td>
    <Td dataLabel="Accelerators">{formatAccelerators(workload.accelerators)}</Td>
    <Td dataLabel="Queue position">
      {formatQueuePosition(workload.queuePosition, workload.status)}
    </Td>
    <Td dataLabel="Priority class">{formatOptionalValue(workload.priority)}</Td>
    <Td dataLabel="Hardware profile">
      <HardwareProfileCell
        hardwareProfile={workload.hardwareProfile}
        hardwareProfileResourceType={workload.hardwareProfileResourceType}
      />
    </Td>
  </Tr>
);

export default ClusterQueueWorkloadTableRow;
