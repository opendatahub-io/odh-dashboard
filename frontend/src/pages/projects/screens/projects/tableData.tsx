import { SortableData } from '../../../../utilities/useTableColumnSort';
import { ProjectKind } from '../../../../k8sTypes';
import { getProjectCreationTime, getProjectDisplayName } from '../../utils';

export const columns: SortableData<ProjectKind>[] = [
  {
    field: 'name',
    label: 'Name',
    sortable: (a, b) => getProjectDisplayName(a).localeCompare(getProjectDisplayName(b)),
  },
  {
    field: 'notebooks',
    label: 'Workbench',
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
    sortable: (a, b) => getProjectCreationTime(a) - getProjectCreationTime(b),
  },
  {
    field: 'kebab',
    label: '',
    sortable: false,
  },
];
