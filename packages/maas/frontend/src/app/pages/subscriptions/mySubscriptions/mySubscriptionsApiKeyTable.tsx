import * as React from 'react';
import {
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
import { useSubscriptionApiKeysTableState } from '~/app/hooks/useSubscriptionApiKeysTableState';
import ApiKeysTableRow from '~/app/pages/api-keys/allKeys/ApiKeysTableRow';
import { ApiKeyColumn } from '~/app/pages/api-keys/allKeys/columns';
import CreateApiKeyModal from '~/app/pages/api-keys/CreateApiKeyModal';
import RevokeApiKeyModal from '~/app/pages/api-keys/RevokeApiKeyModal';

const subscriptionApiKeyColumns: ApiKeyColumn[] = [
  { field: 'name', label: 'Name', width: 25, sortable: false },
  { field: 'status', label: 'Status', width: 10, sortable: false },
  { field: 'creationDate', label: 'Created', width: 15, sortable: false },
  { field: 'expirationDate', label: 'Expires', width: 15, sortable: false },
  { field: 'lastUsedAt', label: 'Last used', width: 15, sortable: false },
];

const formatApiKeysCountLabel = (
  apiKeysOnPage: number,
  page: number,
  perPage: number,
  hasMore: boolean,
): string => {
  const count = (page - 1) * perPage + apiKeysOnPage;
  if (count === 0) {
    return '';
  }
  return hasMore ? `(${count}+)` : `(${count})`;
};

type MySubscriptionsApiKeyTableProps = {
  subscriptionId: string;
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
  subscriptionId,
}) => {
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [revokeApiKey, setRevokeApiKey] = React.useState<APIKey | undefined>(undefined);

  const { response, loaded, refresh, page, perPage, isPageLoading, onSetPage, onPerPageSelect } =
    useSubscriptionApiKeysTableState(subscriptionId);

  const apiKeys = response.data;
  const hasMore = response.has_more;
  const showTableLoading = !loaded || isPageLoading;
  const countLabel =
    loaded && !showTableLoading
      ? formatApiKeysCountLabel(apiKeys.length, page, perPage, hasMore)
      : '';
  const titleText = countLabel ? `API keys ${countLabel}` : 'API keys';

  return (
    <>
      {isModalOpen && (
        <CreateApiKeyModal
          initialSubscription={subscriptionId}
          lockSubscription
          onClose={(created) => {
            setIsModalOpen(false);
            if (created) {
              refresh();
            }
          }}
        />
      )}
      {revokeApiKey && revokeApiKey.name && (
        <RevokeApiKeyModal
          apiKey={revokeApiKey}
          onClose={(revoked) => {
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
              {titleText}
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

      <Table data-testid="subscription-api-keys-table" aria-label="Subscription API keys table">
        <Thead noWrap>
          <Tr>
            {subscriptionApiKeyColumns.map((col) => (
              <Th key={col.field} width={col.width}>
                {col.label}
              </Th>
            ))}
            <Th screenReaderText="Actions" />
          </Tr>
        </Thead>
        <Tbody>
          {showTableLoading ? (
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
              />
            ))
          )}
        </Tbody>
      </Table>

      {loaded && (
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
