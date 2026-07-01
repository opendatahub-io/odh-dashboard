import * as React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import TableRowTitleDescription from '@odh-dashboard/internal/components/table/TableRowTitleDescription';
import { APIKey, APIKeyDisplayStatus, SubscriptionDetail } from '~/app/types/api-key';
import ApiKeyStatusLabel from '~/app/pages/keys-and-subs/apiKeys/ApiKeyStatusLabel';
import { ApiKeyColumn } from './columns';
import SubscriptionCell from './SubscriptionCell';

const formatDate = (dateString?: string, fallback = '—'): string => {
  if (!dateString) {
    return fallback;
  }
  const timestamp = Date.parse(dateString);
  if (Number.isNaN(timestamp)) {
    return fallback;
  }
  return new Date(timestamp).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getDisplayStatus = (apiKey: APIKey, isInactive: boolean): APIKeyDisplayStatus =>
  isInactive ? 'inactive' : apiKey.status;

type CellRenderContext = {
  apiKey: APIKey;
  subscriptionDetail: SubscriptionDetail | undefined;
  isInactive: boolean;
};

type CellRenderer = (ctx: CellRenderContext) => React.ReactNode;

const cellRenderers: Record<string, CellRenderer> = {
  name: ({ apiKey }) => (
    <TableRowTitleDescription
      title={apiKey.name}
      description={apiKey.description}
      truncateDescriptionLines={2}
    />
  ),

  status: ({ apiKey, isInactive }) => {
    const displayStatus = getDisplayStatus(apiKey, isInactive);
    return <ApiKeyStatusLabel status={displayStatus} showInactivePopover />;
  },

  subscription: ({ apiKey, subscriptionDetail }) => (
    <SubscriptionCell
      subscriptionName={apiKey.subscription}
      subscriptionDetail={subscriptionDetail}
    />
  ),

  username: ({ apiKey }) => apiKey.username ?? '—',
  creationDate: ({ apiKey }) => formatDate(apiKey.creationDate, '—'),
  lastUsedAt: ({ apiKey }) => formatDate(apiKey.lastUsedAt, 'Never'),
  expirationDate: ({ apiKey }) => formatDate(apiKey.expirationDate, 'Never'),
};

type ApiKeysTableRowProps = {
  apiKey: APIKey;
  columns: ApiKeyColumn[];
  subscriptionDetail?: SubscriptionDetail;
  isInactive: boolean;
  onRevokeApiKey: (apiKey: APIKey) => void;
};

const ApiKeysTableRow: React.FC<ApiKeysTableRowProps> = ({
  apiKey,
  columns,
  subscriptionDetail,
  isInactive,
  onRevokeApiKey,
}) => {
  const ctx: CellRenderContext = { apiKey, subscriptionDetail, isInactive };

  return (
    <Tr>
      {columns.map((col) => (
        <Td key={col.field} dataLabel={col.label}>
          {cellRenderers[col.field](ctx)}
        </Td>
      ))}
      <Td isActionCell>
        <ActionsColumn
          data-testid="api-key-actions"
          items={[
            {
              title: 'Revoke',
              onClick: () => onRevokeApiKey(apiKey),
              isDisabled: apiKey.status !== 'active',
            },
          ]}
        />
      </Td>
    </Tr>
  );
};

export default ApiKeysTableRow;
