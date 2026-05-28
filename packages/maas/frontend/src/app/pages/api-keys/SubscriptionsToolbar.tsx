import React from 'react';
import {
  MenuToggle,
  SearchInput,
  Select,
  SelectList,
  SelectOption,
  ToggleGroup,
  ToggleGroupItem,
  Toolbar,
  ToolbarContent,
  ToolbarFilter,
  ToolbarGroup,
  ToolbarItem,
  ToolbarToggleGroup,
} from '@patternfly/react-core';
import { FilterIcon } from '@patternfly/react-icons';
import { SubscriptionSortField } from './SubscriptionsTab';
import { ModelSource } from './utils';

type SubscriptionsToolbarProps = {
  sourceFilters: string[];
  onSourceToggle: (source: string) => void;
  onSourceClear: (source: string) => void;
  onClearAllFilters: () => void;
  searchValue: string;
  onSearchChange: (value: string) => void;
  sortField: SubscriptionSortField;
  onSortFieldChange: (field: SubscriptionSortField) => void;
};

const SubscriptionsToolbar: React.FC<SubscriptionsToolbarProps> = ({
  sourceFilters,
  onSourceToggle,
  onSourceClear,
  onClearAllFilters,
  searchValue,
  onSearchChange,
  sortField,
  onSortFieldChange,
}) => {
  const [isSourceSelectOpen, setIsSourceSelectOpen] = React.useState(false);

  return (
    <Toolbar clearAllFilters={onClearAllFilters} data-testid="subscriptions-toolbar">
      <ToolbarContent>
        <ToolbarToggleGroup toggleIcon={<FilterIcon />} breakpoint="md">
          <ToolbarGroup variant="filter-group">
            <ToolbarFilter
              labels={sourceFilters}
              deleteLabel={(_category, label) => {
                const key = typeof label === 'string' ? label : label.key;
                onSourceClear(key);
              }}
              categoryName="Source"
            >
              <Select
                aria-label="Filter by source"
                isOpen={isSourceSelectOpen}
                selected={sourceFilters}
                onSelect={(_event, value) => onSourceToggle(String(value))}
                onOpenChange={setIsSourceSelectOpen}
                toggle={(toggleRef) => (
                  <MenuToggle
                    ref={toggleRef}
                    data-testid="subscriptions-source-filter-toggle"
                    onClick={() => setIsSourceSelectOpen((prev) => !prev)}
                    isExpanded={isSourceSelectOpen}
                  >
                    Source
                  </MenuToggle>
                )}
                popperProps={{ appendTo: 'inline' }}
              >
                <SelectList isAriaMultiselectable>
                  <SelectOption
                    value={ModelSource.Internal}
                    hasCheckbox
                    isSelected={sourceFilters.includes(ModelSource.Internal)}
                  >
                    {ModelSource.Internal}
                  </SelectOption>
                  <SelectOption
                    value={ModelSource.External}
                    hasCheckbox
                    isSelected={sourceFilters.includes(ModelSource.External)}
                  >
                    {ModelSource.External}
                  </SelectOption>
                </SelectList>
              </Select>
            </ToolbarFilter>
          </ToolbarGroup>
        </ToolbarToggleGroup>
        <ToolbarGroup>
          <ToolbarItem>
            <SearchInput
              aria-label="Search subscriptions"
              placeholder="Search..."
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
                text="Subscription"
                buttonId="sort-subscription"
                isSelected={sortField === 'subscription'}
                onChange={() => onSortFieldChange('subscription')}
                data-testid="sort-by-subscription"
              />
              <ToggleGroupItem
                text="Model"
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
};

export default SubscriptionsToolbar;
