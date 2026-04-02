import * as React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { capitalize, Label } from '@patternfly/react-core';
import TableRowTitleDescription from '@odh-dashboard/internal/components/table/TableRowTitleDescription';
import { APIKey, SubscriptionDetail } from '~/app/types/api-key';
import { apiKeyColumns } from './columns';
import SubscriptionCell from './SubscriptionCell';

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
      <Label
        color={
          apiKey.status === 'active' ? 'green' : apiKey.status === 'expired' ? 'red' : 'purple'
        }
      >
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
