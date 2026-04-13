import * as React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { capitalize, Label, LabelProps } from '@patternfly/react-core';
import { BanIcon, CheckCircleIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import TableRowTitleDescription from '@odh-dashboard/internal/components/table/TableRowTitleDescription';
import { APIKey, APIKeyStatus, SubscriptionDetail } from '~/app/types/api-key';
import { ApiKeyColumn } from './columns';
import SubscriptionCell from './SubscriptionCell';

const getApiKeyStatusProps = (
  status: APIKeyStatus,
): { icon: React.ReactNode; status?: LabelProps['status']; color?: LabelProps['color'] } => {
  switch (status) {
    case 'active':
      return { icon: <CheckCircleIcon />, status: 'success' };
    case 'expired':
      return { icon: <ExclamationCircleIcon />, status: 'danger' };
    case 'revoked':
      return { icon: <BanIcon />, color: 'grey' };
    default:
      return { icon: undefined, color: 'grey' };
  }
};

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

const renderApiKeyCell = (
  col: ApiKeyColumn,
  apiKey: APIKey,
  subscriptionDetail: SubscriptionDetail | undefined,
): React.ReactNode => {
  switch (col.field) {
    case 'name':
      return (
        <TableRowTitleDescription
          title={apiKey.name}
          description={apiKey.description}
          truncateDescriptionLines={2}
        />
      );
    case 'status':
      return (
        <Label variant="outline" {...getApiKeyStatusProps(apiKey.status)}>
          {capitalize(apiKey.status)}
        </Label>
      );
    case 'subscription':
      return (
        <SubscriptionCell
          subscriptionName={apiKey.subscription}
          subscriptionDetail={subscriptionDetail}
        />
      );
    case 'username':
      return apiKey.username ?? '—';
    case 'creationDate':
      return formatDate(apiKey.creationDate, '—');
    case 'lastUsedAt':
      return formatDate(apiKey.lastUsedAt, 'Never');
    case 'expirationDate':
      return formatDate(apiKey.expirationDate, 'Never');
    default:
      return null;
  }
};

type ApiKeysTableRowProps = {
  apiKey: APIKey;
  columns: ApiKeyColumn[];
  subscriptionDetail?: SubscriptionDetail;
  onRevokeApiKey: (apiKey: APIKey) => void;
};

const ApiKeysTableRow: React.FC<ApiKeysTableRowProps> = ({
  apiKey,
  columns,
  subscriptionDetail,
  onRevokeApiKey,
}) => (
  <Tr>
    {columns.map((col) => (
      <Td key={col.field} dataLabel={col.label}>
        {renderApiKeyCell(col, apiKey, subscriptionDetail)}
      </Td>
    ))}
    <Td isActionCell>
      <ActionsColumn
        data-testid="api-key-actions"
        items={[
          {
            title: 'Revoke API key',
            onClick: () => onRevokeApiKey(apiKey),
            isDisabled: apiKey.status !== 'active',
          },
        ]}
      />
    </Td>
  </Tr>
);

export default ApiKeysTableRow;
