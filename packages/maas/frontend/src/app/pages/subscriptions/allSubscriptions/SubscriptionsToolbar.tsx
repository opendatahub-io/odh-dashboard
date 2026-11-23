import * as React from 'react';
import { Button, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import { Link } from 'react-router-dom';
import { getSubscriptionCreateUrl } from '~/app/utilities/maasGovernanceNavigation';
import { MaaSSubscription } from '~/app/types/subscriptions';
import { SubscriptionsFilterDataType, SubscriptionsFilterOptions } from './const';
import SubscriptionsFilterToolbar from './SubscriptionsFilterToolbar';

type SubscriptionsToolbarProps = {
  subscriptions: MaaSSubscription[];
  testIdPrefix?: string;
  filterData: SubscriptionsFilterDataType;
  onFilterUpdate: (
    key: SubscriptionsFilterOptions,
    value?: string | { label: string; value: string },
  ) => void;
  returnTo?: string;
  /** Read-only viewers cannot create subscriptions. Defaults to true. */
  showCreateButton?: boolean;
};

const SubscriptionsToolbar: React.FC<SubscriptionsToolbarProps> = ({
  filterData,
  onFilterUpdate,
  returnTo,
  showCreateButton = true,
  subscriptions,
  testIdPrefix,
}) => (
  <SubscriptionsFilterToolbar
    subscriptions={subscriptions}
    testIdPrefix={testIdPrefix}
    filterData={filterData}
    onFilterUpdate={onFilterUpdate}
  >
    <ToolbarGroup>
      {showCreateButton && (
        <ToolbarItem>
          <Button
            variant="primary"
            component={(props) => (
              <Link
                {...props}
                to={getSubscriptionCreateUrl()}
                state={returnTo ? { returnTo } : undefined}
              />
            )}
            data-testid="create-subscription-button"
          >
            Create subscription
          </Button>
        </ToolbarItem>
      )}
    </ToolbarGroup>
  </SubscriptionsFilterToolbar>
);

export default SubscriptionsToolbar;
