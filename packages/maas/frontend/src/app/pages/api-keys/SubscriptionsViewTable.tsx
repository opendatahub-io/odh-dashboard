import {
  Button,
  ClipboardCopy,
  Content,
  ContentVariants,
  Flex,
  FlexItem,
  Label,
  Popover,
} from '@patternfly/react-core';
import { KeyIcon, OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { ExpandableRowContent, Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import React from 'react';
import { Link } from 'react-router-dom';
import { ModelRefInfo, TokenRateLimitInfo, UserSubscription } from '~/app/types/subscriptions';
import { URL_PREFIX } from '~/app/utilities/const';
import { formatWindow } from '~/app/utilities/rateLimits';
import { getSourceLabelColor } from './utils';
import EmptySubscriptionsTabState from './EmptySubscriptionsTabState';

export type ModelGroupSubscription = {
  subscriptionIdHeader: string;
  displayName?: string;
  keyCount?: number;
  tokenRateLimits?: TokenRateLimitInfo[];
};

export type ModelGroupEntry = {
  name: string;
  displayName?: string;
  description?: string;
  source?: string;
  subscriptions: ModelGroupSubscription[];
};

export const formatTokenLimit = (limits?: TokenRateLimitInfo[]): string => {
  if (!limits || limits.length === 0) {
    return '—';
  }
  return limits
    .map((l) => `${l.limit.toLocaleString('en-US')} / ${formatWindow(l.window)}`)
    .join(', ');
};

export const ModelInfoPopover: React.FC<{
  displayName: string;
  modelId: string;
  description?: string;
}> = ({ displayName, modelId, description }) => (
  <Popover
    headerContent={displayName}
    bodyContent={
      <div data-testid="model-info-popover-body">
        <Content
          component={ContentVariants.small}
          className="pf-v6-u-mb-0 pf-v6-u-font-weight-bold"
        >
          Model ID
        </Content>
        <ClipboardCopy isReadOnly hoverTip="Copy" clickTip="Copied" data-testid="model-id-copy">
          {modelId}
        </ClipboardCopy>
        {description && (
          <>
            <Content
              component={ContentVariants.small}
              className="pf-v6-u-mt-sm pf-v6-u-mb-0 pf-v6-u-font-weight-bold"
            >
              Description
            </Content>
            <Content component={ContentVariants.p} className="pf-v6-u-mt-0">
              {description}
            </Content>
          </>
        )}
      </div>
    }
  >
    <Button variant="plain" aria-label={`More info about ${displayName}`} className="pf-v6-u-p-0">
      <OutlinedQuestionCircleIcon />
    </Button>
  </Popover>
);

const ModelRow: React.FC<{ model: ModelRefInfo }> = ({ model }) => (
  <Tr data-testid="subscription-model-row">
    <Td dataLabel="Model">
      <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
        <FlexItem>
          <span className="pf-v6-u-font-weight-bold">{model.display_name || model.name}</span>
        </FlexItem>
        <FlexItem>
          <ModelInfoPopover
            displayName={model.display_name || model.name}
            modelId={model.name}
            description={model.description}
          />
        </FlexItem>
        {model.source && (
          <FlexItem>
            <Label isCompact color={getSourceLabelColor(model.source)}>
              {model.source}
            </Label>
          </FlexItem>
        )}
      </Flex>
      {model.display_name && model.name !== model.display_name && (
        <Content component={ContentVariants.small}>{model.name}</Content>
      )}
    </Td>
    <Td dataLabel="Token limits">{formatTokenLimit(model.token_rate_limits)}</Td>
  </Tr>
);

const SubscriptionRow: React.FC<{
  subscription: UserSubscription;
  rowIndex: number;
}> = ({ subscription, rowIndex }) => {
  const [isExpanded, setIsExpanded] = React.useState(false);

  return (
    <Tbody isExpanded={isExpanded} data-testid="subscription-row">
      <Tr>
        <Td
          data-testid="expand-subscription"
          expand={{
            rowIndex,
            isExpanded,
            onToggle: () => setIsExpanded((prev) => !prev),
          }}
        />
        <Td dataLabel="Subscription">
          <Link
            className="pf-v6-u-font-weight-bold"
            to={`${URL_PREFIX}/keys-and-subs/subscriptions/${subscription.subscription_id_header}`}
          >
            {subscription.display_name || subscription.subscription_id_header}
          </Link>
          {subscription.key_count != null && subscription.key_count > 0 && (
            <>
              {' '}
              <Label isCompact icon={<KeyIcon />} color="green">
                {subscription.key_count} {subscription.key_count === 1 ? 'key' : 'keys'}
              </Label>
            </>
          )}
        </Td>
      </Tr>
      <Tr isExpanded={isExpanded}>
        <Td colSpan={2}>
          <ExpandableRowContent>
            <Table
              aria-label={`Models for ${subscription.display_name || subscription.subscription_id_header}`}
              variant="compact"
              borders={false}
            >
              <Thead>
                <Tr>
                  <Th width={60}>Model</Th>
                  <Th width={40}>Token limits</Th>
                </Tr>
              </Thead>
              <Tbody>
                {subscription.model_refs.length === 0 ? (
                  <Tr>
                    <Td dataLabel="Model">No models in this subscription.</Td>
                    <Td dataLabel="Token limits">—</Td>
                  </Tr>
                ) : (
                  subscription.model_refs.map((model) => (
                    <ModelRow key={model.name} model={model} />
                  ))
                )}
              </Tbody>
            </Table>
          </ExpandableRowContent>
        </Td>
      </Tr>
    </Tbody>
  );
};

type SubscriptionsViewTableProps = {
  subscriptions: UserSubscription[];
  filteredSubscriptions: UserSubscription[];
  subSortDirection: 'asc' | 'desc' | undefined;
  onSubSortDirectionChange: (direction: 'asc' | 'desc') => void;
};

const SubscriptionsViewTable: React.FC<SubscriptionsViewTableProps> = ({
  subscriptions,
  filteredSubscriptions,
  subSortDirection,
  onSubSortDirectionChange,
}) => {
  if (subscriptions.length === 0) {
    return <EmptySubscriptionsTabState hasData={false} variant="subscription" />;
  }

  return (
    <Table aria-label="Subscriptions table" data-testid="subscriptions-table">
      {filteredSubscriptions.length > 0 && (
        <Thead>
          <Tr>
            <Th screenReaderText="Expand" />
            <Th
              sort={{
                sortBy: {
                  index: subSortDirection ? 1 : undefined,
                  direction: subSortDirection,
                },
                onSort: (_event, _index, direction) => onSubSortDirectionChange(direction),
                columnIndex: 1,
              }}
            >
              Subscription
            </Th>
          </Tr>
        </Thead>
      )}
      {filteredSubscriptions.length === 0 ? (
        <Tbody>
          <Tr>
            <Td colSpan={2}>
              <EmptySubscriptionsTabState hasData variant="subscription" />
            </Td>
          </Tr>
        </Tbody>
      ) : (
        filteredSubscriptions.map((sub, index) => (
          <SubscriptionRow key={sub.subscription_id_header} subscription={sub} rowIndex={index} />
        ))
      )}
    </Table>
  );
};

export default SubscriptionsViewTable;
