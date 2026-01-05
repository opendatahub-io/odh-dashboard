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
  Flex,
  FlexItem,
  Button,
  Label,
  ButtonVariant,
} from '@patternfly/react-core';
import { FilterIcon, CloseIcon } from '@patternfly/react-icons';
import { fireMiscTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { AssetsFilterColors } from '~/app/AIAssets/data/filterOptions';

type ModelsListToolbarProps = {
  onFilterUpdate: (filterType: string, value?: string) => void;
  filterData: Record<string, string | undefined>;
  filterOptions: Record<string, string>;
  filterColors?: Record<string, AssetsFilterColors>;
  infoPopover?: React.ReactNode;
  onClearFilters: () => void;
};

const ModelsListToolbar: React.FC<ModelsListToolbarProps> = ({
  onFilterUpdate,
  filterData,
  filterOptions,
  filterColors,
  infoPopover,
  onClearFilters,
}) => {
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = React.useState(false);
  const [currentFilterType, setCurrentFilterType] = React.useState<string>(() => {
    const keys = Object.keys(filterOptions);
    return keys[0];
  });
  const [searchValue, setSearchValue] = React.useState('');

  // Automatically detect source based on component props
  // AI Models table has infoPopover and 'useCase' filter option
  // MaaS Models table has neither
  const source = React.useMemo(() => {
    if (infoPopover || 'useCase' in filterOptions) {
      return 'ai-models';
    }
    return 'maas';
  }, [infoPopover, filterOptions]);

  const handleSearch = () => {
    fireMiscTrackingEvent('AI Assets Filter Applied', {
      filterType: currentFilterType,
      searchValueLength: searchValue.length,
      source,
    });
    onFilterUpdate(currentFilterType, searchValue);
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
  };

  const handleRemoveFilter = (filterType: string) => {
    onFilterUpdate(filterType, '');
  };

  // Get active filters for display
  const activeFilters = Object.entries(filterData).filter(([, value]) => value && value !== '');

  // Get label color based on filter type
  const getLabelColor = (filterType: string): AssetsFilterColors =>
    filterColors?.[filterType] ?? AssetsFilterColors.NAME;

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
                      setSearchValue(''); // Clear search when changing filter type
                    }}
                  >
                    {label}
                  </DropdownItem>
                ))}
              </DropdownList>
            </Dropdown>
          </ToolbarItem>
          <ToolbarItem>
            <SearchInput
              placeholder={`Filter by ${filterOptions[currentFilterType].toLowerCase()}...`}
              value={searchValue}
              onChange={(_event, value) => handleSearchChange(value || '')}
              onSearch={handleSearch}
            />
          </ToolbarItem>
        </ToolbarGroup>

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
                {activeFilters.map(([filterType, value]) => {
                  const displayValue = String(value || '');
                  return (
                    <FlexItem key={filterType}>
                      <Label
                        color={getLabelColor(filterType)}
                        onClose={() => handleRemoveFilter(filterType)}
                        closeBtnProps={{
                          'aria-label': `Remove ${filterOptions[filterType]} filter`,
                        }}
                      >
                        {filterOptions[filterType]}: {displayValue}
                      </Label>
                    </FlexItem>
                  );
                })}
                <FlexItem>
                  <Button
                    variant={ButtonVariant.link}
                    onClick={() => {
                      fireMiscTrackingEvent('AI Assets Filters Cleared', {
                        activeFiltersCount: activeFilters.length,
                        source,
                      });
                      onClearFilters();
                    }}
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
