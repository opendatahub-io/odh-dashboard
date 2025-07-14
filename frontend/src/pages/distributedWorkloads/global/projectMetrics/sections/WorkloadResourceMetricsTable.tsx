import * as React from 'react';
import { DistributedWorkloadsContext } from '#~/concepts/distributedWorkloads/DistributedWorkloadsContext';
import { SortableData, Table } from '#~/components/table';
import {
  getStatusInfo,
  getWorkloadRequestedResources,
} from '#~/concepts/distributedWorkloads/utils';
import { WorkloadKind } from '#~/k8sTypes';
import EmptyStateErrorMessage from '#~/components/EmptyStateErrorMessage';
import { LoadingState } from '#~/pages/distributedWorkloads/components/LoadingState';
import { NoWorkloadState } from '#~/pages/distributedWorkloads/components/NoWorkloadState';
import WorkloadResourceMetricsTableRow from './WorkloadResourceMetricsTableRow';

export const WorkloadResourceMetricsTable: React.FC = () => {
  const { workloads, projectCurrentMetrics } = React.useContext(DistributedWorkloadsContext);
  const requiredFetches = [workloads, projectCurrentMetrics];
  const error = requiredFetches.find((f) => !!f.error)?.error;
  const loaded = requiredFetches.every((f) => f.loaded);

  if (error) {
    return <EmptyStateErrorMessage title="Error loading workloads" bodyText={error.message} />;
  }

  if (!loaded) {
    return <LoadingState />;
  }

  if (!workloads.data.length) {
    return <NoWorkloadState />;
  }

  const { getWorkloadCurrentUsage } = projectCurrentMetrics;

  const columns: SortableData<WorkloadKind>[] = [
    {
      field: 'name',
      label: 'Name',
      sortable: (a, b) =>
        (a.metadata?.name || 'Unnamed').localeCompare(b.metadata?.name || 'Unnamed'),
    },
    {
      field: 'cpuUsage',
      label: 'CPU usage (cores)',
      sortable: (a, b) =>
        (getWorkloadCurrentUsage(a).cpuCoresUsed || 0) -
        (getWorkloadCurrentUsage(b).cpuCoresUsed || 0),
    },
    {
      field: 'memoryUsage',
      label: 'Memory usage (GiB)',
      sortable: (a, b) =>
        (getWorkloadCurrentUsage(a).memoryBytesUsed || 0) -
        (getWorkloadCurrentUsage(b).memoryBytesUsed || 0),
    },
    {
      field: 'status',
      label: 'Status',
      sortable: (a, b) => getStatusInfo(a).status.localeCompare(getStatusInfo(b).status),
    },
  ];

  return (
    <Table
      enablePagination
      data={workloads.data}
      columns={columns}
      emptyTableView={<>No distributed workloads match your filters</>}
      data-testid="workload-resource-metrics-table"
      rowRenderer={(workload) => (
        <WorkloadResourceMetricsTableRow
          workload={workload}
          usage={getWorkloadCurrentUsage(workload)}
          requested={getWorkloadRequestedResources(workload)}
        />
      )}
    />
  );
};
