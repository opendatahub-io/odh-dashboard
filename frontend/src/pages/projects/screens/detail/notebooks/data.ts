import { SortableData } from '../../../../../utilities/useTableColumnSort';
import { getNotebookDisplayName, getNotebookStatusPriority } from '../../../utils';
import { NotebookState } from '../../../notebook/types';

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
