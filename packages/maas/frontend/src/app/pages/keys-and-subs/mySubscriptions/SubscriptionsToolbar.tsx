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
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import {
  MaaSEvents,
  MySubscriptionsGroupByChangedProperties,
  MySubscriptionsGrouping,
} from '~/app/types/event-tracking';
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
}) => {
  const handleGroupingChange = (field: SubscriptionSortField) => {
    if (field === sortField) {
      return;
    }
    fireMiscTrackingEvent(MaaSEvents.MY_SUBSCRIPTIONS_GROUPBY_CHANGED, {
      selectedGrouping:
        field === 'model' ? MySubscriptionsGrouping.MODEL : MySubscriptionsGrouping.SUBSCRIPTION,
    } satisfies MySubscriptionsGroupByChangedProperties);
    onSortFieldChange(field);
  };

  return (
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
                onChange={() => handleGroupingChange('subscription')}
                data-testid="sort-by-subscription"
              />
              <ToggleGroupItem
                text="Model view"
                buttonId="sort-model"
                isSelected={sortField === 'model'}
                onChange={() => handleGroupingChange('model')}
                data-testid="sort-by-model"
              />
            </ToggleGroup>
          </ToolbarItem>
        </ToolbarGroup>
      </ToolbarContent>
    </Toolbar>
  );
};

export default SubscriptionsToolbar;
