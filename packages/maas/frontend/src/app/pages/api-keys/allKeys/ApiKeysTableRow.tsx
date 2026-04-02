import * as React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { capitalize, Label, LabelProps } from '@patternfly/react-core';
import { BanIcon, CheckCircleIcon, ExclamationCircleIcon } from '@patternfly/react-icons';
import TableRowTitleDescription from '@odh-dashboard/internal/components/table/TableRowTitleDescription';
import { APIKey, APIKeyStatus, SubscriptionDetail } from '~/app/types/api-key';
import { apiKeyColumns } from './columns';
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

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

type ApiKeysTableRowProps = {
  apiKey: APIKey;
  subscriptionDetail?: SubscriptionDetail;
  onRevokeApiKey: (apiKey: APIKey) => void;
};

const ApiKeysTableRow: React.FC<ApiKeysTableRowProps> = ({
  apiKey,
  subscriptionDetail,
  onRevokeApiKey,
}) => (
  <Tr>
    <Td dataLabel={apiKeyColumns[0].label}>
      <TableRowTitleDescription
        title={apiKey.name}
        description={apiKey.description}
        truncateDescriptionLines={2}
      />
    </Td>
    <Td dataLabel={apiKeyColumns[1].label}>
      <Label variant="outline" {...getApiKeyStatusProps(apiKey.status)}>
        {capitalize(apiKey.status)}
      </Label>
    </Td>
    <Td dataLabel={apiKeyColumns[2].label}>
      <SubscriptionCell
        subscriptionName={apiKey.subscription}
        subscriptionDetail={subscriptionDetail}
      />
    </Td>
    <Td dataLabel={apiKeyColumns[3].label}>{apiKey.username ?? '—'}</Td>
    <Td dataLabel={apiKeyColumns[4].label}>{formatDate(apiKey.creationDate)}</Td>
    <Td dataLabel={apiKeyColumns[5].label}>
      {apiKey.lastUsedAt ? formatDate(apiKey.lastUsedAt) : 'Never'}
    </Td>
    <Td dataLabel={apiKeyColumns[6].label}>
      {apiKey.expirationDate ? formatDate(apiKey.expirationDate) : 'Never'}
    </Td>
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
