import { RoleBindingKind } from '~/k8sTypes';
import { SortableData } from '~/utilities/useTableColumnSort';
import { compareDatesWithUndefined } from './utils';

export const columnsProjectSharingUser: SortableData<RoleBindingKind>[] = [
  {
    field: 'username',
    label: 'Username',
    width: 30,
    sortable: (a, b) => a.subjects[0]?.name.localeCompare(b.subjects[0]?.name),
  },
  {
    field: 'permission',
    label: 'Permission',
    width: 20,
    sortable: (a, b) => a.roleRef.name.localeCompare(b.roleRef.name),
  },
  {
    field: 'date',
    label: 'Date added',
    width: 30,
    sortable: (a, b) =>
      compareDatesWithUndefined(a.metadata.creationTimestamp, b.metadata.creationTimestamp),
  },
];

export const columnsProjectSharingGroup: SortableData<RoleBindingKind>[] = [
  {
    field: 'group',
    label: 'Name',
    width: 30,
    sortable: (a, b) => a.roleRef.name.localeCompare(b.roleRef.name),
  },
  {
    field: 'permission',
    label: 'Permission',
    width: 20,
    sortable: false,
  },
  {
    field: 'date',
    label: 'Date added',
    width: 30,
    sortable: false,
  },
];
