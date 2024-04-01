import * as React from 'react';
import { Td, Tr } from '@patternfly/react-table';
import { DistributedWorkloadsContext } from '~/concepts/distributedWorkloads/DistributedWorkloadsContext';
import { SortableData, Table } from '~/components/table';
import { WorkloadStatusLabel } from '~/pages/distributedWorkloads/components/WorkloadStatusLabel';
import { WorkloadResourceUsageBar } from '~/pages/distributedWorkloads/components/WorkloadResourceUsageBar';
import {
  WorkloadStatusType,
  getStatusInfo,
  getWorkloadRequestedResources,
} from '~/concepts/distributedWorkloads/utils';
import { bytesAsPreciseGiB } from '~/utilities/number';
import { WorkloadKind } from '~/k8sTypes';
import { ErrorWorkloadState, LoadingWorkloadState, NoWorkloadState } from './SharedStates';

export const WorkloadResourceMetricsTable: React.FC = () => {
  const { workloads, projectCurrentMetrics } = React.useContext(DistributedWorkloadsContext);
  const requiredFetches = [workloads, projectCurrentMetrics];
  const error = requiredFetches.find((f) => !!f.error)?.error;
  const loaded = requiredFetches.every((f) => f.loaded);

  if (error) {
    return <ErrorWorkloadState message={error.message} />;
  }

  if (!loaded) {
    return <LoadingWorkloadState />;
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
      data-id="workload-resource-metrics-table"
      rowRenderer={(workload) => {
        const showUsageBars = [
          WorkloadStatusType.Pending,
          WorkloadStatusType.Admitted,
          WorkloadStatusType.Running,
        ].includes(getStatusInfo(workload).status);
        const usage = getWorkloadCurrentUsage(workload);
        const requested = getWorkloadRequestedResources(workload);
        return (
          <Tr key={workload.metadata?.uid}>
            <Td dataLabel="Name">{workload.metadata?.name || 'Unnamed'}</Td>
            <Td dataLabel="CPU usage (cores)">
              <WorkloadResourceUsageBar
                showData={showUsageBars}
                used={usage.cpuCoresUsed}
                requested={requested.cpuCoresRequested}
                metricLabel="CPU"
                unitLabel="cores"
                progressBarAriaLabel="CPU usage/requested"
              />
            </Td>
            <Td dataLabel="Memory usage (GiB)">
              <WorkloadResourceUsageBar
                showData={showUsageBars}
                used={bytesAsPreciseGiB(usage.memoryBytesUsed)}
                requested={bytesAsPreciseGiB(requested.memoryBytesRequested)}
                metricLabel="Memory"
                unitLabel="GiB"
                progressBarAriaLabel="Memory usage/requested"
              />
            </Td>
            <Td dataLabel="Status">
              <WorkloadStatusLabel workload={workload} />
            </Td>
          </Tr>
        );
      }}
    />
  );
};
