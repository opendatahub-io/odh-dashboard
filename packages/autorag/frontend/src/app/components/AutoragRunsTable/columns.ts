import type { SortableData } from '@odh-dashboard/internal/components/table';
import type { PipelineRun } from '~/app/types';

export const autoragRunsColumns: SortableData<PipelineRun>[] = [
  {
    label: 'Name',
    field: 'name',
    sortable: (a, b) => a.name.localeCompare(b.name),
    width: 20,
  },
  {
    label: 'Description',
    field: 'description',
    sortable: (a, b) => (a.description ?? '').localeCompare(b.description ?? ''),
    width: 25,
  },
  {
    label: 'Tags',
    field: 'tags',
    sortable: (a, b) => (a.tags?.join(',') ?? '').localeCompare(b.tags?.join(',') ?? ''),
    width: 15,
  },
  {
    label: 'Status',
    field: 'status',
    sortable: (a, b) => (a.status || '').localeCompare(b.status || ''),
    width: 15,
  },
];
