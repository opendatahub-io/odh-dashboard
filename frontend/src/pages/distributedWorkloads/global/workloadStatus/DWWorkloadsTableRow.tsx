import * as React from 'react';
import { Td, Tr } from '@patternfly/react-table';
import { Timestamp } from '@patternfly/react-core';
import { WorkloadKind } from '#~/k8sTypes';
import {
  WorkloadStatusInfo,
  getWorkloadStatusMessage,
  getWorkloadName,
} from '#~/concepts/distributedWorkloads/utils';
import { WorkloadStatusLabel } from '#~/pages/distributedWorkloads/components/WorkloadStatusLabel';

type DWWorkloadsTableRowProps = {
  workload: WorkloadKind;
  statusInfo: WorkloadStatusInfo;
};

const DWWorkloadsTableRow: React.FC<DWWorkloadsTableRowProps> = ({ workload, statusInfo }) => (
  <Tr key={workload.metadata?.uid}>
    <Td dataLabel="Name">{getWorkloadName(workload)}</Td>
    <Td dataLabel="Priority">{workload.spec.priority}</Td>
    <Td dataLabel="Status">
      <WorkloadStatusLabel workload={workload} />
    </Td>
    <Td dataLabel="Created">
      {workload.metadata?.creationTimestamp ? (
        <Timestamp date={new Date(workload.metadata.creationTimestamp)} />
      ) : (
        'Unknown'
      )}
    </Td>
    <Td dataLabel="Latest Message">{getWorkloadStatusMessage(statusInfo)}</Td>
  </Tr>
);

export default DWWorkloadsTableRow;
