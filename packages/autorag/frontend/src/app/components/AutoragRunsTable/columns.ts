import type { SortableData } from '@odh-dashboard/internal/components/table';
import type { PipelineRun } from '~/app/types';

export const autoragRunsColumns: SortableData<PipelineRun>[] = [
  {
    label: 'Name',
    field: 'display_name',
    sortable: (a, b) =>
      a.display_name.toLocaleLowerCase().localeCompare(b.display_name.toLocaleLowerCase()),
    width: 20,
  },
  {
    label: 'Description',
    field: 'description',
    sortable: (a, b) =>
      (a.description ?? '')
        .toLocaleLowerCase()
        .localeCompare((b.description ?? '').toLocaleLowerCase()),
    width: 25,
  },
  {
    label: 'Started',
    field: 'created_at',
    sortable: (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    width: 20,
  },
  {
    label: 'Status',
    field: 'state',
    sortable: (a, b) =>
      (a.state || '').toLocaleLowerCase().localeCompare((b.state || '').toLocaleLowerCase()),
    width: 15,
  },
];
