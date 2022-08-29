import { AdminViewUserData } from './types';
import { SortableData } from '../../../../utilities/useTableColumnSort';

export const columns: SortableData<AdminViewUserData>[] = [
  { label: 'User', field: 'name', sortable: true },
  { label: 'Privilege', field: 'privilege', sortable: true },
  { label: 'Last activity', field: 'lastActivity', sortable: true },
  {
    label: 'Server status',
    field: 'serverStatus',
    sortable: (a: AdminViewUserData, b: AdminViewUserData): number => {
      const first = a.serverStatus.notebook ? 1 : -1;
      const second = b.serverStatus.notebook ? 1 : -1;
      return first - second;
    },
  },
];
