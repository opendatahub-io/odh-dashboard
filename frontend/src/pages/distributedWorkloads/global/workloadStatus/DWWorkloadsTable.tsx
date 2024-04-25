import * as React from 'react';
import { Timestamp } from '@patternfly/react-core';
import { Td, Tr } from '@patternfly/react-table';
import EmptyStateErrorMessage from '~/components/EmptyStateErrorMessage';
import { DistributedWorkloadsContext } from '~/concepts/distributedWorkloads/DistributedWorkloadsContext';
import { SortableData, Table } from '~/components/table';
import { WorkloadKind } from '~/k8sTypes';
import { getStatusInfo, getWorkloadName } from '~/concepts/distributedWorkloads/utils';
import { WorkloadStatusLabel } from '~/pages/distributedWorkloads/components/WorkloadStatusLabel';
import { NoWorkloadState } from '~/pages/distributedWorkloads/components/NoWorkloadState';
import { LoadingState } from '~/pages/distributedWorkloads/components/LoadingState';

export const DWWorkloadsTable: React.FC = () => {
  const { workloads } = React.useContext(DistributedWorkloadsContext);

  if (workloads.error) {
    return (
      <EmptyStateErrorMessage
        title="Error loading distributed workloads"
        bodyText={workloads.error.message}
      />
    );
  }

  if (!workloads.loaded) {
    return <LoadingState />;
  }

  const columns: SortableData<WorkloadKind>[] = [
    {
      field: 'name',
      label: 'Name',
      sortable: (a, b) =>
        (a.metadata?.name || 'Unnamed').localeCompare(b.metadata?.name || 'Unnamed'),
    },
    {
      field: 'priority',
      label: 'Priority',
      sortable: (a, b) => (a.spec.priority || 0) - (b.spec.priority || 0),
    },
    {
      field: 'status',
      label: 'Status',
      sortable: (a, b) => getStatusInfo(a).status.localeCompare(getStatusInfo(b).status),
    },
    {
      field: 'created',
      label: 'Created',
      sortable: (a, b) =>
        (a.metadata?.creationTimestamp || '').localeCompare(b.metadata?.creationTimestamp || ''),
    },
    {
      field: 'latest-message',
      label: 'Latest Message',
      sortable: false,
    },
  ];

  if (!workloads.data.length) {
    return (
      <NoWorkloadState subTitle="Select another project or create a distributed workload in the selected project." />
    );
  }
  return (
    <Table
      enablePagination
      data={workloads.data}
      columns={columns}
      data-id="workload-table"
      rowRenderer={(workload) => {
        const statusInfo = getStatusInfo(workload);
        return (
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
            <Td dataLabel="Latest Message">{statusInfo.message}</Td>
          </Tr>
        );
      }}
    />
  );
};
