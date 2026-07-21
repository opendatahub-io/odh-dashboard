import React from 'react';
import {
  SearchInput,
  ToggleGroup,
  ToggleGroupItem,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { SubscriptionSortField } from './SubscriptionsTab';

type SubscriptionsToolbarProps = {
  searchValue: string;
  onSearchChange: (value: string) => void;
  sortField: SubscriptionSortField;
  onSortFieldChange: (field: SubscriptionSortField) => void;
};

const SubscriptionsToolbar: React.FC<SubscriptionsToolbarProps> = ({
  searchValue,
  onSearchChange,
  sortField,
  onSortFieldChange,
}) => (
  <Toolbar data-testid="subscriptions-toolbar">
    <ToolbarContent>
      <ToolbarGroup>
        <ToolbarItem>
          <SearchInput
            aria-label="Filter by subscription or model name"
            placeholder="Filter by subscription or model name"
            style={{ minWidth: '350px' }}
            data-testid="subscriptions-search-input"
            value={searchValue}
            onChange={(_event, value) => onSearchChange(value)}
            onClear={() => onSearchChange('')}
          />
        </ToolbarItem>
      </ToolbarGroup>
      <ToolbarGroup>
        <ToolbarItem>
          <ToggleGroup aria-label="Sort by field" data-testid="subscriptions-sort-toggle">
            <ToggleGroupItem
              text="Subscription view"
              buttonId="sort-subscription"
              isSelected={sortField === 'subscription'}
              onChange={() => onSortFieldChange('subscription')}
              data-testid="sort-by-subscription"
            />
            <ToggleGroupItem
              text="Model view"
              buttonId="sort-model"
              isSelected={sortField === 'model'}
              onChange={() => onSortFieldChange('model')}
              data-testid="sort-by-model"
            />
          </ToggleGroup>
        </ToolbarItem>
      </ToolbarGroup>
    </ToolbarContent>
  </Toolbar>
);

export default SubscriptionsToolbar;
