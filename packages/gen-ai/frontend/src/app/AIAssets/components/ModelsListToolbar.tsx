import * as React from 'react';
import {
  MenuToggle,
  Dropdown,
  Toolbar,
  ToolbarGroup,
  ToolbarContent,
  ToolbarItem,
  DropdownList,
  DropdownItem,
  SearchInput,
  Select,
  SelectOption,
  SelectList,
  Flex,
  FlexItem,
  Button,
  Label,
  ButtonVariant,
} from '@patternfly/react-core';
import { FilterIcon, CloseIcon } from '@patternfly/react-icons';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { AssetsFilterColors, assetsFilterSelectOptions } from '~/app/AIAssets/data/filterOptions';
import { FilterData } from '~/app/AIAssets/hooks/useAIModelsFilter';

type ModelsListToolbarProps = {
  onFilterUpdate: (filterType: string, value?: string | string[]) => void;
  filterData: FilterData;
  filterOptions: Record<string, string>;
  filterColors?: Record<string, AssetsFilterColors>;
  infoPopover?: React.ReactNode;
  onClearFilters: () => void;
  resultsCount?: number;
  toolbarActions?: React.ReactNode;
};

const ModelsListToolbar: React.FC<ModelsListToolbarProps> = ({
  onFilterUpdate,
  filterData,
  filterOptions,
  filterColors,
  infoPopover,
  onClearFilters,
  resultsCount,
  toolbarActions,
}) => {
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = React.useState(false);
  const [currentFilterType, setCurrentFilterType] = React.useState<string>(() => {
    const keys = Object.keys(filterOptions);
    return keys[0];
  });
  const [searchValue, setSearchValue] = React.useState('');
  const [isSelectOpen, setIsSelectOpen] = React.useState(false);

  const isSelectFilter = currentFilterType in assetsFilterSelectOptions;

  // Sync search input with external filter state (e.g., when "Clear all" resets filterData)
  React.useEffect(() => {
    const currentValue = filterData[currentFilterType];
    if (!isSelectFilter && typeof currentValue !== 'string') {
      setSearchValue('');
    } else if (!isSelectFilter && typeof currentValue === 'string') {
      setSearchValue(currentValue);
    }
  }, [filterData, currentFilterType, isSelectFilter]);

  const handleSearch = () => {
    onFilterUpdate(currentFilterType, searchValue);
    fireMiscTrackingEvent('Available Endpoints Filter Performed', {
      filterType: currentFilterType,
      resultsCount: resultsCount ?? 0,
    });
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
  };

  const handleSelectToggle = (option: string) => {
    onFilterUpdate(currentFilterType, option);
    fireMiscTrackingEvent('Available Endpoints Filter Performed', {
      filterType: currentFilterType,
      resultsCount: resultsCount ?? 0,
    });
  };

  const handleRemoveFilter = (filterType: string, value?: string) => {
    const current = filterData[filterType];
    if (Array.isArray(current) && value) {
      const updated = current.filter((v) => v !== value);
      onFilterUpdate(filterType, updated.length > 0 ? updated : undefined);
    } else {
      onFilterUpdate(filterType, undefined);
    }
  };

  const getLabelColor = (filterType: string): AssetsFilterColors =>
    filterColors?.[filterType] ?? AssetsFilterColors.NAME;

  const activeFilters = React.useMemo(() => {
    const filters: { filterType: string; value: string }[] = [];
    Object.entries(filterData).forEach(([filterType, value]) => {
      if (Array.isArray(value)) {
        value.forEach((v) => {
          filters.push({ filterType, value: v });
        });
      } else if (value && value !== '') {
        filters.push({ filterType, value });
      }
    });
    return filters;
  }, [filterData]);

  const currentFilterValue = filterData[currentFilterType];
  const selectedSelectValues = Array.isArray(currentFilterValue) ? currentFilterValue : [];
  const currentSelectOptions: string[] =
    Object.entries(assetsFilterSelectOptions).find(([key]) => key === currentFilterType)?.[1] ?? [];

  return (
    <Toolbar data-testid="models-table-toolbar">
      <ToolbarContent>
        <ToolbarGroup variant="filter-group">
          <ToolbarItem>
            <Dropdown
              onOpenChange={(isOpen) => setIsFilterDropdownOpen(isOpen)}
              shouldFocusToggleOnSelect
              toggle={(toggleRef) => (
                <MenuToggle
                  ref={toggleRef}
                  aria-label="Filter toggle"
                  onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                  isExpanded={isFilterDropdownOpen}
                  icon={<FilterIcon />}
                >
                  {filterOptions[currentFilterType]}
                </MenuToggle>
              )}
              isOpen={isFilterDropdownOpen}
              popperProps={{ appendTo: 'inline' }}
            >
              <DropdownList>
                {Object.entries(filterOptions).map(([key, label]) => (
                  <DropdownItem
                    key={key}
                    id={key}
                    onClick={() => {
                      setIsFilterDropdownOpen(false);
                      setCurrentFilterType(key);
                      setSearchValue('');
                      setIsSelectOpen(false);
                    }}
                  >
                    {label}
                  </DropdownItem>
                ))}
              </DropdownList>
            </Dropdown>
          </ToolbarItem>
          <ToolbarItem>
            {isSelectFilter ? (
              <Select
                role="menu"
                aria-label={`Filter by ${filterOptions[currentFilterType].toLowerCase()}`}
                isOpen={isSelectOpen}
                onOpenChange={setIsSelectOpen}
                toggle={(toggleRef) => (
                  <MenuToggle
                    ref={toggleRef}
                    onClick={() => setIsSelectOpen(!isSelectOpen)}
                    isExpanded={isSelectOpen}
                    style={{ minWidth: '200px' }}
                  >
                    {`Filter by ${filterOptions[currentFilterType].toLowerCase()}`}
                    {selectedSelectValues.length > 0 && <>{` (${selectedSelectValues.length})`}</>}
                  </MenuToggle>
                )}
                onSelect={(_event, value) => {
                  if (typeof value === 'string') {
                    handleSelectToggle(value);
                  }
                }}
              >
                <SelectList>
                  {currentSelectOptions.map((option) => (
                    <SelectOption
                      key={option}
                      value={option}
                      hasCheckbox
                      isSelected={selectedSelectValues.includes(option)}
                    >
                      {option}
                    </SelectOption>
                  ))}
                </SelectList>
              </Select>
            ) : (
              <SearchInput
                placeholder={`Filter by ${filterOptions[currentFilterType].toLowerCase()}...`}
                value={searchValue}
                onChange={(_event, value) => handleSearchChange(value || '')}
                onSearch={handleSearch}
              />
            )}
          </ToolbarItem>
        </ToolbarGroup>

        {toolbarActions && (
          <ToolbarGroup variant="action-group-plain">
            <ToolbarItem>{toolbarActions}</ToolbarItem>
          </ToolbarGroup>
        )}

        {infoPopover && (
          <ToolbarGroup variant="action-group">
            <ToolbarItem>{infoPopover}</ToolbarItem>
          </ToolbarGroup>
        )}
      </ToolbarContent>

      {activeFilters.length > 0 && (
        <ToolbarContent>
          <ToolbarGroup>
            <ToolbarItem>
              <span
                style={{
                  fontWeight: 'var(--pf-t--global--font--weight--body--bold)',
                }}
              >
                Active filters:
              </span>
            </ToolbarItem>
            <ToolbarItem>
              <Flex gap={{ default: 'gapSm' }} wrap="wrap">
                {activeFilters.map(({ filterType, value }) => (
                  <FlexItem key={`${filterType}-${value}`}>
                    <Label
                      color={getLabelColor(filterType)}
                      onClose={() => handleRemoveFilter(filterType, value)}
                      closeBtnProps={{
                        'aria-label': `Remove ${filterOptions[filterType]} filter: ${value}`,
                      }}
                    >
                      {filterOptions[filterType]}: {value}
                    </Label>
                  </FlexItem>
                ))}
                <FlexItem>
                  <Button
                    variant={ButtonVariant.link}
                    onClick={onClearFilters}
                    icon={<CloseIcon />}
                  >
                    Clear all filters
                  </Button>
                </FlexItem>
              </Flex>
            </ToolbarItem>
          </ToolbarGroup>
        </ToolbarContent>
      )}
    </Toolbar>
  );
};

export default ModelsListToolbar;
