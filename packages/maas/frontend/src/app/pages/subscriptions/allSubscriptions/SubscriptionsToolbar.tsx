import * as React from 'react';
import { Button, SearchInput, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import FilterToolbar from '@odh-dashboard/ui-core/components/FilterToolbar';
import { Link } from 'react-router-dom';
import { getSubscriptionCreateUrl } from '~/app/utilities/subscriptionManagementNavigation';
import {
  SubscriptionsFilterDataType,
  SubscriptionsFilterOptions,
  subscriptionsFilterOptions,
} from './const';

type SubscriptionsToolbarProps = {
  filterData: SubscriptionsFilterDataType;
  onFilterUpdate: (
    key: SubscriptionsFilterOptions,
    value?: string | { label: string; value: string },
  ) => void;
  returnTo?: string;
};

const SubscriptionsToolbar: React.FC<SubscriptionsToolbarProps> = ({
  filterData,
  onFilterUpdate,
  returnTo,
}) => (
  <FilterToolbar<SubscriptionsFilterOptions>
    data-testid="subscriptions-table-toolbar"
    filterOptions={subscriptionsFilterOptions}
    filterOptionRenders={{
      [SubscriptionsFilterOptions.keyword]: ({ onChange, ...props }) => (
        <SearchInput
          {...props}
          style={{ minWidth: '350px' }}
          aria-label="Filter by name, resource name, or description"
          placeholder="Filter by name, resource name, or description"
          onChange={(_event, value) => onChange(value)}
          data-testid="subscriptions-filter-input"
        />
      ),
    }}
    filterData={filterData}
    onFilterUpdate={onFilterUpdate}
  >
    <ToolbarGroup>
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
    </ToolbarGroup>
  </FilterToolbar>
);

export default SubscriptionsToolbar;
