import { SortableData } from '#~/components/table';
import { getStatusInfo } from '#~/concepts/distributedWorkloads/utils';
import { WorkloadKind } from '#~/k8sTypes';

export const DWWorkloadsTableColumns: SortableData<WorkloadKind>[] = [
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
