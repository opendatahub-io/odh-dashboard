import { RoleBindingKind } from '~/k8sTypes';
import { SortableData } from '~/components/table/useTableColumnSort';
import { ensureRoleBindingCreationSorting, firstSubject } from './utils';

export const columnsProjectSharingUser: SortableData<RoleBindingKind>[] = [
  {
    field: 'username',
    label: 'Username',
    width: 30,
    sortable: (a, b, key, sortDirection) =>
      ensureRoleBindingCreationSorting(
        a,
        b,
        sortDirection,
        firstSubject(a).localeCompare(firstSubject(b)),
      ),
  },
  {
    field: 'permission',
    label: 'Permission',
    width: 20,
    sortable: (a, b, key, sortDirection) =>
      ensureRoleBindingCreationSorting(
        a,
        b,
        sortDirection,
        a.roleRef.name.localeCompare(b.roleRef.name),
      ),
  },
  {
    field: 'date',
    label: 'Date added',
    width: 25,
    sortable: (a, b, key, sortDirection) =>
      ensureRoleBindingCreationSorting(
        a,
        b,
        sortDirection,
        new Date(b.metadata.creationTimestamp || 0).getTime() -
          new Date(a.metadata.creationTimestamp || 0).getTime(),
      ),
  },
];

export const columnsProjectSharingGroup: SortableData<RoleBindingKind>[] = [
  {
    field: 'username',
    label: 'Name',
    width: 30,
    sortable: (a, b, key, sortDirection) =>
      ensureRoleBindingCreationSorting(
        a,
        b,
        sortDirection,
        firstSubject(a).localeCompare(firstSubject(b)),
      ),
  },
  {
    field: 'permission',
    label: 'Permission',
    width: 20,
    sortable: (a, b, key, sortDirection) =>
      ensureRoleBindingCreationSorting(
        a,
        b,
        sortDirection,
        a.roleRef.name.localeCompare(b.roleRef.name),
      ),
  },
  {
    field: 'date',
    label: 'Date added',
    width: 25,
    sortable: (a, b, key, sortDirection) =>
      ensureRoleBindingCreationSorting(
        a,
        b,
        sortDirection,
        new Date(b.metadata.creationTimestamp || 0).getTime() -
          new Date(a.metadata.creationTimestamp || 0).getTime(),
      ),
  },
];
