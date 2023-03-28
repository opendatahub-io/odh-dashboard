import { SortableData } from '~/utilities/useTableColumnSort';
import { UserPermission } from './types';

export const columnsProjectSharing: SortableData<UserPermission>[] = [
    {
      field: 'username',
      label: 'Username',
      width: 30,
      sortable: (a, b) => a.username.localeCompare(b.username),
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
  