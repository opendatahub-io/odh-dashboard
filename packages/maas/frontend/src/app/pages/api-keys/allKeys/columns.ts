import { SortableData } from '@odh-dashboard/internal/components/table/types';
import { APIKey } from '~/app/types/api-key';

export const apiKeyColumns: SortableData<APIKey>[] = [
  {
    field: 'name',
    label: 'Name',
    width: 25,
    sortable: (a: APIKey, b: APIKey): number => a.name.localeCompare(b.name),
  },
  {
    field: 'status',
    label: 'Status',
    width: 15,
    sortable: (a: APIKey, b: APIKey): number => a.status.localeCompare(b.status),
  },
  {
    field: 'creationDate',
    label: 'Creation date',
    width: 20,
    sortable: (a: APIKey, b: APIKey): number =>
      new Date(a.creationDate).getTime() - new Date(b.creationDate).getTime(),
  },
  {
    field: 'expirationDate',
    label: 'Expiration date',
    width: 20,
    sortable: (a: APIKey, b: APIKey): number =>
      new Date(a.expirationDate).getTime() - new Date(b.expirationDate).getTime(),
  },
];
