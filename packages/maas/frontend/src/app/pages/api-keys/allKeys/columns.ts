import { SortableData } from '@odh-dashboard/internal/components/table/types';
import { APIKey, APIKeySearchRequest } from '~/app/types/api-key';

export type ApiKeySortField = NonNullable<NonNullable<APIKeySearchRequest['sort']>['by']>;

export type ApiKeyColumn = SortableData<APIKey> & {
  serverSortField?: ApiKeySortField;
};

export const apiKeyColumns: ApiKeyColumn[] = [
  {
    field: 'name',
    label: 'Name',
    width: 20,
    sortable: true,
    serverSortField: 'name',
  },
  {
    field: 'status',
    label: 'Status',
    width: 10,
    sortable: false,
  },
  {
    field: 'subscription',
    label: 'Subscription',
    width: 15,
    sortable: false,
  },
  {
    field: 'username',
    label: 'Owner',
    width: 10,
    sortable: false,
  },
  {
    field: 'creationDate',
    label: 'Creation date',
    width: 15,
    sortable: true,
    serverSortField: 'created_at',
  },
  {
    field: 'lastUsedAt',
    label: 'Last used',
    width: 15,
    sortable: true,
    serverSortField: 'last_used_at',
  },
  {
    field: 'expirationDate',
    label: 'Expiration date',
    width: 15,
    sortable: true,
    serverSortField: 'expires_at',
  },
];

export const getVisibleApiKeyColumns = (isMaasAdmin: boolean): ApiKeyColumn[] =>
  isMaasAdmin ? apiKeyColumns : apiKeyColumns.filter((col) => col.field !== 'username');
