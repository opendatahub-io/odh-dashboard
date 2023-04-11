import { RoleBindingKind } from '~/k8sTypes';
import { SortableData } from '~/utilities/useTableColumnSort';

export const columnsProjectSharing: SortableData<RoleBindingKind>[] = [
    {
      field: 'username',
      label: 'Username',
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
  