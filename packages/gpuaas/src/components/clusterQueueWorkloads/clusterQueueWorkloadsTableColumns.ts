import type { SortableData } from '@odh-dashboard/ui-core';
import { CLUSTER_QUEUE_WORKLOADS_TYPE_HELP } from '../../const';
import type { ClusterQueueWorkloadRow } from '../../types';

const compareOptionalStrings = (a: string | undefined, b: string | undefined): number =>
  (a ?? '').localeCompare(b ?? '');

const clusterQueueColumn: SortableData<ClusterQueueWorkloadRow> = {
  field: 'clusterQueue',
  label: 'Cluster queue',
  sortable: (a, b) => a.clusterQueue.localeCompare(b.clusterQueue),
};

const sharedColumns: SortableData<ClusterQueueWorkloadRow>[] = [
  {
    field: 'name',
    label: 'Name',
    sortable: (a, b) => a.name.localeCompare(b.name),
  },
  {
    field: 'project',
    label: 'Project',
    sortable: (a, b) => a.project.localeCompare(b.project),
  },
  {
    field: 'type',
    label: 'Type',
    info: {
      popover: CLUSTER_QUEUE_WORKLOADS_TYPE_HELP,
      popoverProps: {
        showClose: false,
      },
    },
    sortable: (a, b) => a.type.localeCompare(b.type),
  },
  {
    field: 'status',
    label: 'Status',
    sortable: (a, b) => a.status.localeCompare(b.status),
  },
  {
    field: 'localQueue',
    label: 'Local queue',
    sortable: (a, b) => a.localQueue.localeCompare(b.localQueue),
  },
  {
    field: 'accelerators',
    label: 'Accelerators',
    sortable: (a, b) => a.accelerators - b.accelerators,
  },
  {
    field: 'queuePosition',
    label: 'Queue position',
    sortable: (a, b) =>
      (a.queuePosition ?? Number.MAX_SAFE_INTEGER) - (b.queuePosition ?? Number.MAX_SAFE_INTEGER),
  },
  {
    field: 'priority',
    label: 'Priority class',
    sortable: (a, b) => compareOptionalStrings(a.priority, b.priority),
  },
  {
    field: 'hardwareProfile',
    label: 'Hardware profile',
    sortable: (a, b) => compareOptionalStrings(a.hardwareProfile, b.hardwareProfile),
  },
];

export type ClusterQueueWorkloadsTableColumnOptions = {
  showClusterQueue?: boolean;
};

export const getClusterQueueWorkloadsTableColumns = (
  options: ClusterQueueWorkloadsTableColumnOptions = {},
): SortableData<ClusterQueueWorkloadRow>[] =>
  options.showClusterQueue ? [clusterQueueColumn, ...sharedColumns] : sharedColumns;

/** Default columns for per-cluster-queue cards (cluster queue implied by card context). */
export const clusterQueueWorkloadsTableColumns = getClusterQueueWorkloadsTableColumns();
