import { SortableData } from '~/components/table/useTableColumnSort';
import { getNotebookDisplayName, getNotebookStatusPriority } from '~/pages/projects/utils';
import { NotebookState } from '~/pages/projects/notebook/types';

export const columns: SortableData<NotebookState>[] = [
  {
    field: 'expand',
    label: '',
    sortable: false,
  },
  {
    field: 'name',
    label: 'Name',
    width: 30,
    sortable: (a, b) =>
      getNotebookDisplayName(a.notebook).localeCompare(getNotebookDisplayName(b.notebook)),
  },
  {
    field: 'image',
    label: 'Notebook image',
    width: 20,
    sortable: false,
  },
  {
    field: 'size',
    label: 'Container size',
    width: 15,
    sortable: false,
  },
  {
    field: 'status',
    label: 'Status',
    sortable: (a, b) => getNotebookStatusPriority(a) - getNotebookStatusPriority(b),
  },
  {
    field: 'open',
    label: '',
    sortable: false,
  },
  {
    field: 'kebab',
    label: '',
    sortable: false,
  },
];
