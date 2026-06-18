import * as React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { capitalize, Label, Popover } from '@patternfly/react-core';
import type { LabelProps } from '@patternfly/react-core';
import {
  BanIcon,
  CheckCircleIcon,
  MinusCircleIcon,
  OutlinedClockIcon,
  OutlinedQuestionCircleIcon,
} from '@patternfly/react-icons';
import TableRowTitleDescription from '@odh-dashboard/internal/components/table/TableRowTitleDescription';
import { APIKey, APIKeyDisplayStatus, SubscriptionDetail } from '~/app/types/api-key';
import { ApiKeyColumn } from './columns';
import SubscriptionCell from './SubscriptionCell';

const getApiKeyStatusProps = (
  status: APIKeyDisplayStatus,
): { icon: React.ReactNode; status?: LabelProps['status']; variant?: LabelProps['variant'] } => {
  switch (status) {
    case 'active':
      return { icon: <CheckCircleIcon />, status: 'success' };
    case 'inactive':
      return { icon: <MinusCircleIcon />, variant: 'filled' };
    case 'expired':
      return { icon: <OutlinedClockIcon /> };
    case 'revoked':
      return { icon: <BanIcon />, status: 'danger' };
    default:
      return { icon: <OutlinedQuestionCircleIcon /> };
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
    const { variant, ...labelProps } = getApiKeyStatusProps(displayStatus);
    const label = (
      <Label variant={variant ?? 'outline'} {...labelProps}>
        {capitalize(displayStatus)}
      </Label>
    );

    if (displayStatus !== 'inactive') {
      return label;
    }

    return (
      <Popover
        headerContent="Subscription unavailable"
        bodyContent="The subscription this key was created for has been deleted or is not ready. The key itself has not been revoked, but it cannot authenticate requests until the subscription is restored."
      >
        <span style={{ cursor: 'pointer' }}>{label}</span>
      </Popover>
    );
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
