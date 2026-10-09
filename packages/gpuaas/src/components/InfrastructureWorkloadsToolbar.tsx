import * as React from 'react';
/* eslint-disable no-restricted-imports */
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownList,
  Label,
  LabelGroup,
  MenuToggle,
  SearchInput,
  Select,
  SelectList,
  SelectOption,
  ToolbarContent,
  ToolbarFilter,
  ToolbarGroup,
  ToolbarItem,
  ToolbarToggleGroup,
} from '@patternfly/react-core';
/* eslint-enable no-restricted-imports */
import { FilterIcon } from '@patternfly/react-icons';
import type {
  InfrastructureWorkloadsFilterType,
  InfrastructureWorkloadsFilterValues,
} from '../types/infrastructureWorkloads';

type InfrastructureWorkloadsToolbarProps = {
  availableFilterValues: InfrastructureWorkloadsFilterValues;
  selectedFilterValues: InfrastructureWorkloadsFilterValues;
  searchValue: string;
  filterType: InfrastructureWorkloadsFilterType;
  onSearchChange: (value: string) => void;
  onFilterTypeChange: (value: InfrastructureWorkloadsFilterType) => void;
  onFilterValueChange: (type: InfrastructureWorkloadsFilterType, value: string) => void;
  onClearFilters: () => void;
};

type WorkloadFilterSelectProps = {
  type: InfrastructureWorkloadsFilterType;
  options: string[];
  selectedValues: string[];
  onChange: (value: string) => void;
};

const FILTER_LABELS: Record<InfrastructureWorkloadsFilterType, string> = {
  status: 'Status',
  type: 'Type',
  hardwareProfile: 'Hardware profile',
};

const FILTER_TYPES: InfrastructureWorkloadsFilterType[] = ['status', 'type', 'hardwareProfile'];

const WorkloadFilterSelect: React.FC<WorkloadFilterSelectProps> = ({
  type,
  options,
  selectedValues,
  onChange,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <Select
      aria-label={`Filter by ${type}`}
      isOpen={isOpen}
      selected={selectedValues}
      onSelect={(_event, value) => {
        if (typeof value === 'string' && options.includes(value)) {
          onChange(value);
        }
        setIsOpen(false);
      }}
      onOpenChange={setIsOpen}
      toggle={(toggleRef) => (
        <MenuToggle
          ref={toggleRef}
          data-testid={`infrastructure-workloads-${type}-filter`}
          onClick={() => setIsOpen((open) => !open)}
          isExpanded={isOpen}
        >
          {`Filter by ${FILTER_LABELS[type].toLowerCase()}`}
        </MenuToggle>
      )}
      popperProps={{ appendTo: 'inline' }}
      data-testid={`infrastructure-workloads-${type}-select`}
    >
      <SelectList style={{ maxHeight: '200px', overflow: 'auto' }}>
        {options.map((option) => (
          <SelectOption
            key={option}
            value={option}
            isSelected={selectedValues.includes(option)}
            data-testid={`infrastructure-workloads-${type}-option-${option}`}
          >
            {option}
          </SelectOption>
        ))}
      </SelectList>
    </Select>
  );
};

const InfrastructureWorkloadsToolbar: React.FC<InfrastructureWorkloadsToolbarProps> = ({
  availableFilterValues,
  selectedFilterValues,
  searchValue,
  filterType,
  onSearchChange,
  onFilterTypeChange,
  onFilterValueChange,
  onClearFilters,
}) => {
  const [isFilterTypeOpen, setIsFilterTypeOpen] = React.useState(false);
  const selectedFilterCount = FILTER_TYPES.reduce(
    (count, type) => count + selectedFilterValues[type].length,
    0,
  );

  return (
    <>
      <ToolbarToggleGroup breakpoint="md" toggleIcon={<FilterIcon />}>
        <ToolbarContent>
          <ToolbarGroup
            variant="filter-group"
            gap={{ default: 'gapSm' }}
            data-testid="infrastructure-workloads-toolbar"
          >
            <ToolbarItem>
              <SearchInput
                aria-label="Find by name"
                placeholder="Find by name"
                value={searchValue}
                onChange={(_event, value) => onSearchChange(value)}
                onClear={() => onSearchChange('')}
                data-testid="infrastructure-workloads-name-filter"
              />
            </ToolbarItem>
            <ToolbarItem>
              <Dropdown
                onOpenChange={setIsFilterTypeOpen}
                shouldFocusToggleOnSelect
                toggle={(toggleRef) => (
                  <MenuToggle
                    ref={toggleRef}
                    data-testid="infrastructure-workloads-filter-type"
                    aria-label="Filter attribute"
                    onClick={() => setIsFilterTypeOpen((open) => !open)}
                    isExpanded={isFilterTypeOpen}
                    icon={<FilterIcon />}
                  >
                    {FILTER_LABELS[filterType]}
                  </MenuToggle>
                )}
                isOpen={isFilterTypeOpen}
                popperProps={{ appendTo: 'inline' }}
              >
                <DropdownList>
                  {FILTER_TYPES.map((type) => (
                    <DropdownItem
                      key={type}
                      isSelected={filterType === type}
                      data-testid={`infrastructure-workloads-filter-option-${type}`}
                      onClick={() => {
                        setIsFilterTypeOpen(false);
                        onFilterTypeChange(type);
                      }}
                    >
                      {FILTER_LABELS[type]}
                    </DropdownItem>
                  ))}
                </DropdownList>
              </Dropdown>
            </ToolbarItem>
            {FILTER_TYPES.map((type) => (
              <ToolbarFilter
                key={type}
                categoryName={FILTER_LABELS[type]}
                showToolbarItem={filterType === type}
                data-testid={`infrastructure-workloads-${type}-filter-group`}
              >
                <WorkloadFilterSelect
                  type={type}
                  options={availableFilterValues[type]}
                  selectedValues={selectedFilterValues[type]}
                  onChange={(value) => onFilterValueChange(type, value)}
                />
              </ToolbarFilter>
            ))}
          </ToolbarGroup>
        </ToolbarContent>
      </ToolbarToggleGroup>
      {selectedFilterCount > 0 && (
        <ToolbarContent id="infrastructure-workloads-active-filters">
          <ToolbarGroup variant="filter-group" gap={{ default: 'gapSm' }}>
            {FILTER_TYPES.map((type) =>
              selectedFilterValues[type].length > 0 ? (
                <ToolbarItem key={type}>
                  <LabelGroup
                    categoryName={FILTER_LABELS[type]}
                    data-testid={`infrastructure-workloads-${type}-chips`}
                  >
                    {selectedFilterValues[type].map((value) => (
                      <Label
                        key={value}
                        isCompact
                        onClose={() => onFilterValueChange(type, value)}
                        data-testid={`infrastructure-workloads-${type}-chip-${value}`}
                      >
                        {value}
                      </Label>
                    ))}
                  </LabelGroup>
                </ToolbarItem>
              ) : null,
            )}
            <ToolbarItem>
              <Button variant="link" onClick={onClearFilters}>
                Clear filters
              </Button>
            </ToolbarItem>
          </ToolbarGroup>
        </ToolbarContent>
      )}
    </>
  );
};

export default InfrastructureWorkloadsToolbar;
