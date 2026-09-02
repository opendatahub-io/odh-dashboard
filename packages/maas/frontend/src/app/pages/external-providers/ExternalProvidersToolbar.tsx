import * as React from 'react';
import {
  Button,
  SearchInput,
  ToolbarItem,
  ToolbarGroup,
  SelectOption,
  SelectList,
  Select,
  MenuToggle,
  ToolbarFilter,
  ToolbarToggleGroup,
  Dropdown,
  DropdownItem,
  DropdownList,
} from '@patternfly/react-core';
import { FilterIcon } from '@patternfly/react-icons';
import { Link } from 'react-router-dom';
import {
  ExternalProviderFilterOption,
  ExternalProvidersFilterDataType,
  externalProvidersFilterOptions,
  ExternalProvidersFilterOptions,
  ExternalProvidersMultiSelectFilterKey,
  externalProvidersManagementPath,
  externalProviderStatusFilterOptions,
  externalProviderAuthenticationFilterOptions,
  externalProviderTypeFilterOptions,
} from '~/app/pages/external-providers/const';

type ExternalProvidersToolBarProps = {
  namespace: string;
  filterData: ExternalProvidersFilterDataType;
  onNameChange: (value: string) => void;
  onMultiSelectToggle: (key: ExternalProvidersMultiSelectFilterKey, value: string) => void;
  onMultiSelectClear: (key: ExternalProvidersMultiSelectFilterKey, value: string) => void;
};

const getOptionLabel = (options: ExternalProviderFilterOption[], value: string): string =>
  options.find((option) => option.value === value)?.label ?? value;

type FilterToolbarMultiSelectProps = {
  ariaLabel: string;
  placeholder: string;
  categoryName: string;
  options: ExternalProviderFilterOption[];
  selectedValues: string[];
  onToggle: (value: string) => void;
  onClear: (value: string) => void;
  testId: string;
  isActive: boolean;
};

const FilterToolbarMultiSelect: React.FC<FilterToolbarMultiSelectProps> = ({
  ariaLabel,
  placeholder,
  categoryName,
  options,
  selectedValues,
  onToggle,
  onClear,
  testId,
  isActive,
}) => {
  const [isOpen, setIsOpen] = React.useState(false);
  const optionValues = React.useMemo(
    () => new Set(options.map((option) => option.value)),
    [options],
  );

  return (
    <ToolbarFilter
      categoryName={categoryName}
      labels={selectedValues.map((value) => ({
        key: value,
        node: <span data-testid={`${testId}-chip-${value}`}>{getOptionLabel(options, value)}</span>,
      }))}
      deleteLabel={(_category, label) => {
        const key = typeof label === 'string' ? label : label.key;
        if (optionValues.has(key)) {
          onClear(key);
        }
      }}
      showToolbarItem={selectedValues.length > 0 || isActive}
    >
      {isActive ? (
        <Select
          aria-label={ariaLabel}
          isOpen={isOpen}
          selected={selectedValues}
          onSelect={(_event, value) => {
            if (typeof value === 'string' && optionValues.has(value)) {
              onToggle(value);
            }
          }}
          onOpenChange={setIsOpen}
          toggle={(toggleRef) => (
            <MenuToggle
              ref={toggleRef}
              data-testid={`${testId}-toggle`}
              onClick={() => setIsOpen((prev) => !prev)}
              isExpanded={isOpen}
            >
              {placeholder}
            </MenuToggle>
          )}
          popperProps={{ appendTo: 'inline' }}
          data-testid={testId}
        >
          <SelectList isAriaMultiselectable>
            {options.map((option) => (
              <SelectOption
                key={option.value}
                value={option.value}
                hasCheckbox
                isSelected={selectedValues.includes(option.value)}
                data-testid={`${testId}-option-${option.value}`}
              >
                {option.label}
              </SelectOption>
            ))}
          </SelectList>
        </Select>
      ) : null}
    </ToolbarFilter>
  );
};

const ExternalProvidersToolBar: React.FC<ExternalProvidersToolBarProps> = ({
  namespace,
  filterData,
  onNameChange,
  onMultiSelectToggle,
  onMultiSelectClear,
}) => {
  const filterKeys: ExternalProvidersFilterOptions[] = [
    ExternalProvidersFilterOptions.name,
    ExternalProvidersFilterOptions.providerType,
    ExternalProvidersFilterOptions.authentication,
    ExternalProvidersFilterOptions.status,
  ];
  const [isFilterTypeOpen, setIsFilterTypeOpen] = React.useState(false);
  const [currentFilterType, setCurrentFilterType] = React.useState<ExternalProvidersFilterOptions>(
    ExternalProvidersFilterOptions.name,
  );

  return (
    <>
      <ToolbarToggleGroup breakpoint="md" toggleIcon={<FilterIcon />}>
        <ToolbarGroup variant="filter-group" data-testid="external-providers-table-toolbar">
          <ToolbarItem>
            <Dropdown
              onOpenChange={setIsFilterTypeOpen}
              shouldFocusToggleOnSelect
              toggle={(toggleRef) => (
                <MenuToggle
                  data-testid="filter-toolbar-dropdown"
                  ref={toggleRef}
                  aria-label="Filter toggle"
                  onClick={() => setIsFilterTypeOpen((prev) => !prev)}
                  isExpanded={isFilterTypeOpen}
                  icon={<FilterIcon />}
                >
                  {externalProvidersFilterOptions[currentFilterType]}
                </MenuToggle>
              )}
              isOpen={isFilterTypeOpen}
              popperProps={{ appendTo: 'inline' }}
            >
              <DropdownList>
                {filterKeys.map((filterKey) => (
                  <DropdownItem
                    key={filterKey}
                    data-testid={`filter-toolbar-option-${filterKey}`}
                    onClick={() => {
                      setIsFilterTypeOpen(false);
                      setCurrentFilterType(filterKey);
                    }}
                  >
                    {externalProvidersFilterOptions[filterKey]}
                  </DropdownItem>
                ))}
              </DropdownList>
            </Dropdown>
          </ToolbarItem>
          <ToolbarFilter
            categoryName={externalProvidersFilterOptions[ExternalProvidersFilterOptions.name]}
            labels={
              filterData.name
                ? [
                    {
                      key: ExternalProvidersFilterOptions.name,
                      node: <span data-testid="name-filter-chip">{filterData.name}</span>,
                    },
                  ]
                : []
            }
            deleteLabel={() => onNameChange('')}
            showToolbarItem={
              !!filterData.name || currentFilterType === ExternalProvidersFilterOptions.name
            }
          >
            {currentFilterType === ExternalProvidersFilterOptions.name ? (
              <SearchInput
                aria-label="Filter by name"
                placeholder="Filter by name"
                value={filterData.name}
                onChange={(_event, value) => onNameChange(value)}
                data-testid="external-providers-filter-input"
              />
            ) : null}
          </ToolbarFilter>
          <FilterToolbarMultiSelect
            ariaLabel="Filter by provider type"
            placeholder="Filter by provider type"
            categoryName={
              externalProvidersFilterOptions[ExternalProvidersFilterOptions.providerType]
            }
            options={externalProviderTypeFilterOptions}
            selectedValues={filterData.providerType}
            onToggle={(value) =>
              onMultiSelectToggle(ExternalProvidersFilterOptions.providerType, value)
            }
            onClear={(value) =>
              onMultiSelectClear(ExternalProvidersFilterOptions.providerType, value)
            }
            testId="external-providers-provider-type-filter"
            isActive={currentFilterType === ExternalProvidersFilterOptions.providerType}
          />
          <FilterToolbarMultiSelect
            ariaLabel="Filter by authentication"
            placeholder="Filter by authentication"
            categoryName={
              externalProvidersFilterOptions[ExternalProvidersFilterOptions.authentication]
            }
            options={externalProviderAuthenticationFilterOptions}
            selectedValues={filterData.authentication}
            onToggle={(value) =>
              onMultiSelectToggle(ExternalProvidersFilterOptions.authentication, value)
            }
            onClear={(value) =>
              onMultiSelectClear(ExternalProvidersFilterOptions.authentication, value)
            }
            testId="external-providers-authentication-filter"
            isActive={currentFilterType === ExternalProvidersFilterOptions.authentication}
          />
          <FilterToolbarMultiSelect
            ariaLabel="Filter by status"
            placeholder="Filter by status"
            categoryName={externalProvidersFilterOptions[ExternalProvidersFilterOptions.status]}
            options={externalProviderStatusFilterOptions}
            selectedValues={filterData.status}
            onToggle={(value) => onMultiSelectToggle(ExternalProvidersFilterOptions.status, value)}
            onClear={(value) => onMultiSelectClear(ExternalProvidersFilterOptions.status, value)}
            testId="external-providers-status-filter"
            isActive={currentFilterType === ExternalProvidersFilterOptions.status}
          />
        </ToolbarGroup>
      </ToolbarToggleGroup>
      <ToolbarGroup>
        <ToolbarItem>
          <Button
            data-testid="add-external-provider-button"
            variant="primary"
            component={(props) => (
              <Link {...props} to={externalProvidersManagementPath(namespace)} />
            )}
          >
            Add external provider
          </Button>
        </ToolbarItem>
      </ToolbarGroup>
    </>
  );
};

export default ExternalProvidersToolBar;
