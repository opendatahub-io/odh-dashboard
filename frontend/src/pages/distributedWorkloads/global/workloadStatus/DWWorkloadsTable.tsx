import * as React from 'react';
import EmptyStateErrorMessage from '#~/components/EmptyStateErrorMessage';
import { DistributedWorkloadsContext } from '#~/concepts/distributedWorkloads/DistributedWorkloadsContext';
import { Table } from '#~/components/table';
import { NoWorkloadState } from '#~/pages/distributedWorkloads/components/NoWorkloadState';
import { LoadingState } from '#~/pages/distributedWorkloads/components/LoadingState';
import { getStatusInfo } from '#~/concepts/distributedWorkloads/utils';
import DWWorkloadsTableRow from './DWWorkloadsTableRow';
import { DWWorkloadsTableColumns } from './columns';

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

  if (!workloads.data.length) {
    return (
      <NoWorkloadState subTitle="Select another project or create a distributed workload in the selected project." />
    );
  }
  return (
    <Table
      enablePagination
      data={workloads.data}
      columns={DWWorkloadsTableColumns}
      data-id="workload-table"
      rowRenderer={(workload) => (
        <DWWorkloadsTableRow workload={workload} statusInfo={getStatusInfo(workload)} />
      )}
    />
  );
};
