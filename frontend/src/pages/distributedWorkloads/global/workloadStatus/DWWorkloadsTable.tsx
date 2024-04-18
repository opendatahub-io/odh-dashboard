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
import DWWorkloadsTableRow from './DWWorkloadsTableRow';

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
      rowRenderer={(workload) => (
        <DWWorkloadsTableRow
          workload={workload}
          statusInfo={getStatusInfo(workload)}
        />
      )}
    />
  );
};
