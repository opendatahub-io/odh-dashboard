import { RoleBindingKind } from '~/k8sTypes';
import { SortableData } from '~/utilities/useTableColumnSort';
import { compareDatesWithUndefined, ensureRoleBindingCreationSorting } from './utils';

export const columnsProjectSharingUser: SortableData<RoleBindingKind>[] = [
  {
    field: 'username',
    label: 'Username',
    width: 30,
    sortable: (a, b, undefined, sortDirection) => ensureRoleBindingCreationSorting(a, b, sortDirection, a.subjects[0]?.name.localeCompare(b.subjects[0]?.name))
  },
  {
    field: 'permission',
    label: 'Permission',
    width: 20,
    sortable: (a, b, undefined, sortDirection) => ensureRoleBindingCreationSorting(a, b, sortDirection,  a.roleRef.name.localeCompare(b.roleRef.name))
  },
  {
    field: 'date',
    label: 'Date added',
    width: 30,
    sortable: (a, b, undefined, sortDirection) => ensureRoleBindingCreationSorting(a, b, sortDirection,  compareDatesWithUndefined(a.metadata.creationTimestamp, b.metadata.creationTimestamp))
  },
];

export const columnsProjectSharingGroup: SortableData<RoleBindingKind>[] = [
  {
    field: 'group',
    label: 'Username',
    width: 30,
    sortable: (a, b, undefined, sortDirection) => ensureRoleBindingCreationSorting(a, b, sortDirection, a.subjects[0]?.name.localeCompare(b.subjects[0]?.name))
  },
  {
    field: 'permission',
    label: 'Permission',
    width: 20,
    sortable: (a, b, undefined, sortDirection) => ensureRoleBindingCreationSorting(a, b, sortDirection,  a.roleRef.name.localeCompare(b.roleRef.name))
  },
  {
    field: 'date',
    label: 'Date added',
    width: 30,
    sortable: (a, b, undefined, sortDirection) => ensureRoleBindingCreationSorting(a, b, sortDirection,  compareDatesWithUndefined(a.metadata.creationTimestamp, b.metadata.creationTimestamp))
  },
];

