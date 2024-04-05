import * as React from 'react';
import { Card, CardTitle, Bullseye, Spinner, Timestamp } from '@patternfly/react-core';
import { Td, Tr } from '@patternfly/react-table';
import EmptyStateErrorMessage from '~/components/EmptyStateErrorMessage';
import { DistributedWorkloadsContext } from '~/concepts/distributedWorkloads/DistributedWorkloadsContext';
import { SortableData, Table } from '~/components/table';
import { WorkloadKind } from '~/k8sTypes';
import { getStatusInfo } from '~/concepts/distributedWorkloads/utils';
import { WorkloadStatusLabel } from '~/pages/distributedWorkloads/components/WorkloadStatusLabel';

export const DWWorkloadsTable: React.FC = () => {
  const { workloads } = React.useContext(DistributedWorkloadsContext);

  if (workloads.error) {
    return (
      <Card isFullHeight>
        <EmptyStateErrorMessage
          title="Error loading distributed workloads"
          bodyText={workloads.error.message}
        />
      </Card>
    );
  }

  if (!workloads.loaded) {
    return (
      <Card isFullHeight>
        <Bullseye style={{ minHeight: 150 }}>
          <Spinner />
        </Bullseye>
      </Card>
    );
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

  return (
    <Card>
      <CardTitle>Distributed Workloads</CardTitle>
      <Table
        enablePagination
        data={workloads.data}
        columns={columns}
        emptyTableView={<>No distributed workloads match your filters</>}
        data-id="workload-table"
        rowRenderer={(workload) => {
          const statusInfo = getStatusInfo(workload);
          return (
            <Tr key={workload.metadata?.uid}>
              <Td dataLabel="Name">{workload.metadata?.name || 'Unnamed'}</Td>
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
    </Card>
  );
};
