import * as React from 'react';
import { Pagination, Toolbar, ToolbarContent, ToolbarItem } from '@patternfly/react-core';
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import DashboardEmptyTableView from '@odh-dashboard/internal/concepts/dashboard/DashboardEmptyTableView';
import { APIKey } from '~/app/types/api-key';
import { ApiKeySortField, apiKeyColumns } from './columns';
import ApiKeysTableRow from './ApiKeysTableRow';

type SortDirection = 'asc' | 'desc';

type ApiKeysTableProps = {
  apiKeys: APIKey[];
  hasMore: boolean;
  page: number;
  perPage: number;
  sortField: ApiKeySortField;
  sortDirection: SortDirection;
  onSetPage: (newPage: number) => void;
  onPerPageSelect: (newPerPage: number, newPage: number) => void;
  onSort: (field: ApiKeySortField, direction: SortDirection) => void;
  toolbarContent?: React.ReactNode;
  onRevokeApiKey: (apiKey: APIKey) => void;
  onClearFilters: () => void;
};

const ApiKeysTable: React.FC<ApiKeysTableProps> = ({
  apiKeys,
  hasMore,
  page,
  perPage,
  sortField,
  sortDirection,
  onSetPage,
  onPerPageSelect,
  onSort,
  onRevokeApiKey,
  toolbarContent,
  onClearFilters,
}) => {
  const activeSortIndex = apiKeyColumns.findIndex((c) => c.serverSortField === sortField);

  const pagination = (variant: 'top' | 'bottom') => (
    <Pagination
      toggleTemplate={
        hasMore
          ? ({ firstIndex, lastIndex }) => (
              <>
                <b>
                  {firstIndex} - {lastIndex}
                </b>{' '}
                of <b>many</b>
              </>
            )
          : undefined
      }
      itemCount={hasMore ? undefined : (page - 1) * perPage + apiKeys.length}
      perPage={perPage}
      page={page}
      onSetPage={(_e, newPage) => onSetPage(newPage)}
      onPerPageSelect={(_e, newSize, newPage) => onPerPageSelect(newSize, newPage)}
      variant={variant}
      widgetId="api-keys-pagination"
      isCompact={variant === 'top'}
      menuAppendTo="inline"
    />
  );

  return (
    <>
      <Toolbar inset={{ default: 'insetNone' }} className="pf-v6-u-w-100">
        <ToolbarContent>
          {toolbarContent && <ToolbarItem>{toolbarContent}</ToolbarItem>}
          <ToolbarItem
            variant="pagination"
            align={{ default: 'alignEnd' }}
            className="pf-v6-u-pr-lg"
          >
            {pagination('top')}
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>

      <Table data-testid="api-keys-table" aria-label="API keys table">
        <Thead noWrap>
          <Tr>
            {apiKeyColumns.map((col, i) => (
              <Th
                key={col.field}
                width={col.width}
                sort={
                  col.serverSortField
                    ? {
                        sortBy: {
                          index: activeSortIndex,
                          direction: sortDirection,
                          defaultDirection: 'asc',
                        },
                        onSort: (_e, _index, direction) => {
                          if (col.serverSortField) {
                            onSort(col.serverSortField, direction);
                          }
                        },
                        columnIndex: i,
                      }
                    : undefined
                }
              >
                {col.label}
              </Th>
            ))}
          </Tr>
        </Thead>
        <Tbody>
          {apiKeys.length === 0 ? (
            <Tr>
              <Td colSpan={apiKeyColumns.length}>
                <DashboardEmptyTableView onClearFilters={onClearFilters} />
              </Td>
            </Tr>
          ) : (
            apiKeys.map((apiKey) => (
              <ApiKeysTableRow key={apiKey.id} apiKey={apiKey} onRevokeApiKey={onRevokeApiKey} />
            ))
          )}
        </Tbody>
      </Table>

      {pagination('bottom')}
    </>
  );
};

export default ApiKeysTable;
