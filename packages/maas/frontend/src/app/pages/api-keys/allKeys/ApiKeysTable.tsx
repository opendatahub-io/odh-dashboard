import * as React from 'react';
import Table from '@odh-dashboard/internal/components/table/Table';
import DashboardEmptyTableView from '@odh-dashboard/internal/concepts/dashboard/DashboardEmptyTableView';
import { APIKey } from '~/app/types/api-key';
import { apiKeyColumns } from './columns';
import ApiKeysTableRow from './ApiKeysTableRow';

type ApiKeysTableProps = {
  apiKeys: APIKey[];
};

const ApiKeysTable: React.FC<ApiKeysTableProps> = ({ apiKeys }) => (
  <Table
    data-testid="api-keys-table"
    id="api-keys-table"
    enablePagination
    data={apiKeys}
    columns={apiKeyColumns}
    defaultSortColumn={0}
    emptyTableView={<DashboardEmptyTableView onClearFilters={() => undefined} />}
    rowRenderer={(apiKey) => <ApiKeysTableRow key={apiKey.id} apiKey={apiKey} />}
  />
);

export default ApiKeysTable;
