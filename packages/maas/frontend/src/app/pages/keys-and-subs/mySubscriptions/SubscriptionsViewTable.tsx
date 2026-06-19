import { Flex, FlexItem } from '@patternfly/react-core';
import { ExpandableRowContent, Table, Thead, Tbody, Tr, Th, Td } from '@patternfly/react-table';
import React from 'react';
import { Link } from 'react-router-dom';
import { TokenRateLimitInfo, UserSubscription } from '~/app/types/subscriptions';
import { URL_PREFIX } from '~/app/utilities/const';
import ApiKeyCountLabel from '~/app/components/ApiKeyCountLabel';
import SubscriptionModelsTable from './SubscriptionModelsTable';
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
          <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem>
              <Link
                className="pf-v6-u-font-weight-bold"
                to={`${URL_PREFIX}/keys-and-subs/subscriptions/${subscription.subscription_id_header}`}
              >
                {subscription.display_name || subscription.subscription_id_header}
              </Link>
            </FlexItem>
            <ApiKeyCountLabel keyCount={subscription.key_count ?? 0} />
          </Flex>
        </Td>
      </Tr>
      <Tr isExpanded={isExpanded}>
        <Td colSpan={2}>
          <ExpandableRowContent>
            <SubscriptionModelsTable
              models={subscription.model_refs}
              ariaLabel={`Models for ${subscription.display_name || subscription.subscription_id_header}`}
              tableTestId={`subscription-models-table-${subscription.subscription_id_header}`}
            />
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
