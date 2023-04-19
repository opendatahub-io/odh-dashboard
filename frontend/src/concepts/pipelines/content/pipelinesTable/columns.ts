import { SortableData } from '~/utilities/useTableColumnSort';
import { PipelineKF } from '~/concepts/pipelines/kfTypes';

export const columns: SortableData<PipelineKF>[] = [
  {
    field: 'expand',
    label: '',
    sortable: false,
  },
  {
    label: 'Pipeline name',
    field: 'pipeline',
    sortable: (a, b) => a.name.localeCompare(b.name),
    width: 25,
  },
  {
    label: 'Last run',
    field: 'lastRun',
    sortable: false,
  },
  {
    label: 'Last run status',
    field: 'lastRunStatus',
    sortable: false,
  },
  {
    label: 'Last run time',
    field: 'lastRunTime',
    sortable: false,
  },
  {
    label: 'Created',
    field: 'created',
    sortable: (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
  },
  {
    label: '',
    field: 'actions',
    sortable: false,
  },
];
