import { SortableData } from '../../../../utilities/useTableColumnSort';
import { ProjectKind } from '../../../../k8sTypes';

export const columns: SortableData<ProjectKind>[] = [
  {
    field: 'name',
    label: 'Name',
    sortable: true,
  },
  {
    field: 'notebooks',
    label: 'Data science workspace',
    sortable: false,
  },
  {
    field: 'notebook-status',
    label: 'Status',
    sortable: false,
  },
  {
    field: 'created',
    label: 'Created',
    sortable: false,
  },
  {
    field: 'kebab',
    label: '',
    sortable: false,
  },
];
