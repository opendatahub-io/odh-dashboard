import * as React from 'react';
import {
  Alert,
  Bullseye,
  Button,
  EmptyState,
  EmptyStateBody,
  Pagination,
  Skeleton,
  Stack,
  StackItem,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import { Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import { APIKey } from '~/app/types/api-key';
import { UserSubscription } from '~/app/types/subscriptions';
import { useSubscriptionApiKeysTableState } from '~/app/hooks/useSubscriptionApiKeysTableState';
import ApiKeysTableRow from '~/app/pages/keys-and-subs/apiKeys/allKeys/ApiKeysTableRow';
import { ApiKeyColumn } from '~/app/pages/keys-and-subs/apiKeys/allKeys/columns';
import CreateApiKeyModal from '~/app/pages/keys-and-subs/apiKeys/CreateApiKeyModal';
import RevokeApiKeyModal from '~/app/pages/keys-and-subs/apiKeys/RevokeApiKeyModal';

const subscriptionApiKeyColumns: ApiKeyColumn[] = [
  {
    field: 'name',
    label: 'Name',
    width: 25,
    sortable: true,
    serverSortField: 'name',
  },
  { field: 'status', label: 'Status', width: 10, sortable: false },
  {
    field: 'creationDate',
    label: 'Created',
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
    label: 'Expires',
    width: 15,
    sortable: true,
    serverSortField: 'expires_at',
  },
];

type MySubscriptionsApiKeyTableProps = {
  subscription: UserSubscription;
};

const SubscriptionApiKeySkeletonRows: React.FC<{ rowCount: number }> = ({ rowCount }) =>
  Array.from({ length: rowCount }, (_, rowIndex) => (
    <Tr
      key={`api-key-skeleton-${rowIndex}`}
      data-testid={rowIndex === 0 ? 'subscription-api-keys-loading' : undefined}
    >
      {subscriptionApiKeyColumns.map((col) => (
        <Td key={col.field} dataLabel={col.label}>
          {col.field === 'name' ? (
            <Stack>
              <StackItem>
                <Skeleton width="65%" screenreaderText="Loading" />
              </StackItem>
              <StackItem>
                <Skeleton width="40%" screenreaderText="Loading" />
              </StackItem>
            </Stack>
          ) : (
            <Skeleton width="50%" screenreaderText="Loading" />
          )}
        </Td>
      ))}
      <Td isActionCell>
        <Skeleton width="2rem" screenreaderText="Loading" />
      </Td>
    </Tr>
  ));

const MySubscriptionsApiKeyTable: React.FC<MySubscriptionsApiKeyTableProps> = ({
  subscription,
}) => {
  const subscriptionId = subscription.subscription_id_header;
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [revokeApiKey, setRevokeApiKey] = React.useState<APIKey | undefined>(undefined);

  const {
    response,
    loaded,
    error,
    refresh,
    page,
    perPage,
    sortField,
    sortDirection,
    isFetching,
    onSetPage,
    onPerPageSelect,
    onSort,
  } = useSubscriptionApiKeysTableState(subscriptionId);

  const apiKeys = response.data;
  const showTableLoading = !loaded || isFetching;
  const activeSortIndex = subscriptionApiKeyColumns.findIndex(
    (c) => c.serverSortField === sortField,
  );

  return (
    <>
      {isModalOpen && (
        <CreateApiKeyModal
          initialSubscription={subscription}
          onClose={(created?: boolean) => {
            setIsModalOpen(false);
            if (created) {
              refresh();
            }
          }}
        />
      )}
      {revokeApiKey && (
        <RevokeApiKeyModal
          apiKey={revokeApiKey}
          onClose={(revoked?: boolean) => {
            setRevokeApiKey(undefined);
            if (revoked) {
              refresh();
            }
          }}
        />
      )}

      <Toolbar inset={{ default: 'insetNone' }} className="pf-v6-u-w-100">
        <ToolbarContent>
          <ToolbarItem>
            <Title headingLevel="h2" size="xl" data-testid="subscription-api-keys-title">
              API keys
            </Title>
          </ToolbarItem>
          <ToolbarItem align={{ default: 'alignEnd' }}>
            <Button
              variant="primary"
              onClick={() => setIsModalOpen(true)}
              isDisabled={!loaded}
              data-testid="create-api-key-button"
            >
              Create API key
            </Button>
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>

      {error && (
        <Alert
          variant="danger"
          isInline
          title="Failed to load API keys"
          data-testid="subscription-api-keys-error"
        >
          {error.message}
        </Alert>
      )}
      <Table data-testid="subscription-api-keys-table" aria-label="Subscription API keys table">
        <Thead noWrap>
          <Tr>
            {subscriptionApiKeyColumns.map((col, i) => (
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
            <Th screenReaderText="Actions" />
          </Tr>
        </Thead>
        <Tbody>
          {showTableLoading && !error ? (
            <SubscriptionApiKeySkeletonRows rowCount={perPage} />
          ) : apiKeys.length === 0 ? (
            <Tr>
              <Td colSpan={subscriptionApiKeyColumns.length + 1}>
                <Bullseye>
                  <EmptyState
                    headingLevel="h2"
                    titleText="No API keys"
                    data-testid="subscription-api-keys-empty"
                  >
                    <EmptyStateBody>
                      Create an API key to access models in this subscription.
                    </EmptyStateBody>
                  </EmptyState>
                </Bullseye>
              </Td>
            </Tr>
          ) : (
            apiKeys.map((apiKey) => (
              <ApiKeysTableRow
                key={apiKey.id}
                apiKey={apiKey}
                columns={subscriptionApiKeyColumns}
                onRevokeApiKey={setRevokeApiKey}
                isInactive={false}
              />
            ))
          )}
        </Tbody>
      </Table>

      {loaded && (
        <Pagination
          toggleTemplate={({ firstIndex, lastIndex }) =>
            response.has_more ? (
              <>
                <b>
                  {firstIndex} - {lastIndex}
                </b>{' '}
                of <b>many</b>
              </>
            ) : (
              <>
                <b>
                  {firstIndex} - {lastIndex}
                </b>{' '}
                of <b>{lastIndex}</b>
              </>
            )
          }
          itemCount={!response.has_more ? (page - 1) * perPage + apiKeys.length : undefined}
          perPage={perPage}
          page={page}
          onSetPage={(_e, newPage) => onSetPage(newPage)}
          onPerPageSelect={(_e, newSize, newPage) => onPerPageSelect(newSize, newPage)}
          variant="bottom"
          widgetId="subscription-api-keys-pagination"
          menuAppendTo="inline"
          className="pf-v6-u-mt-md"
        />
      )}
    </>
  );
};

export default MySubscriptionsApiKeyTable;
