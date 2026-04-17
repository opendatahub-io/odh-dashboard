import * as React from 'react';
import { Button, SearchInput, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import FilterToolbar from '@odh-dashboard/internal/components/FilterToolbar';
import { PlusIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router-dom';
import { URL_PREFIX } from '~/app/utilities/const';
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
};

const SubscriptionsToolbar: React.FC<SubscriptionsToolbarProps> = ({
  filterData,
  onFilterUpdate,
}) => {
  const navigate = useNavigate();
  return (
    <FilterToolbar<SubscriptionsFilterOptions>
      data-testid="subscriptions-table-toolbar"
      filterOptions={subscriptionsFilterOptions}
      filterOptionRenders={{
        [SubscriptionsFilterOptions.keyword]: ({ onChange, ...props }) => (
          <SearchInput
            {...props}
            style={{ minWidth: '300px' }}
            aria-label="Filter by name or description"
            placeholder="Filter by name or description"
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
            icon={<PlusIcon />}
            onClick={() => {
              navigate(`${URL_PREFIX}/subscriptions/create`);
            }}
            data-testid="create-subscription-button"
          >
            Create Subscription
          </Button>
        </ToolbarItem>
      </ToolbarGroup>
    </FilterToolbar>
  );
};

export default SubscriptionsToolbar;
