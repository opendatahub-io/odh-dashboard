import { SortableData } from '~/components/table';
import { AdminViewUserData } from './types';

export const columns: SortableData<AdminViewUserData>[] = [
  { label: 'User', field: 'name', sortable: true },
  { label: 'Privilege', field: 'privilege', sortable: true },
  { label: 'Last activity', field: 'lastActivity', sortable: true },
  {
    label: 'Workbench status',
    field: 'serverStatus',
    sortable: (a: AdminViewUserData, b: AdminViewUserData): number => {
      const first = a.serverStatus.isNotebookRunning ? 1 : -1;
      const second = b.serverStatus.isNotebookRunning ? 1 : -1;
      return first - second;
    },
  },
  {
    label: '',
    field: 'actions',
    sortable: false,
  },
];
