import * as React from 'react';
import {
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  Button,
  ButtonVariant,
  Popover,
  SearchInput,
  Dropdown,
  DropdownItem,
  MenuToggle,
  DropdownList,
  Flex,
  FlexItem,
  Label,
  Content,
} from '@patternfly/react-core';
import { FilterIcon } from '@patternfly/react-icons';
import { AIAssetsFilterOptions, aiAssetsFilterOptions } from '~/app/AIAssets/data/filterOptions';

type AIAssetsFilterToolbarProps = {
  filterData: Record<AIAssetsFilterOptions, string | { label: string; value: string } | undefined>;
  onFilterUpdate: (
    filterType: AIAssetsFilterOptions,
    value?: string | { label: string; value: string },
  ) => void;
  onClearFilters: () => void;
  // Pagination props
  page?: number;
  perPage?: number;
  itemCount?: number;
};

const AIAssetsFilterToolbar: React.FC<AIAssetsFilterToolbarProps> = ({
  filterData,
  onFilterUpdate,
  onClearFilters,
  page = 1,
  perPage = 10,
  itemCount = 0,
}) => {
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = React.useState(false);
  const [currentFilterType, setCurrentFilterType] = React.useState<AIAssetsFilterOptions>(
    AIAssetsFilterOptions.NAME,
  );
  const [searchValue, setSearchValue] = React.useState('');

  const handleFilterDropdownToggle = () => {
    setIsFilterDropdownOpen(!isFilterDropdownOpen);
  };

  const handleSearch = () => {
    onFilterUpdate(currentFilterType, searchValue);
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
  };

  const handleRemoveFilter = (filterType: AIAssetsFilterOptions) => {
    onFilterUpdate(filterType, '');
  };

  // Get label color based on filter type
  const getLabelColor = (filterType: string): 'blue' | 'green' | 'purple' => {
    switch (filterType) {
      case AIAssetsFilterOptions.NAME:
        return 'blue';
      case AIAssetsFilterOptions.KEYWORD:
        return 'green';
      case AIAssetsFilterOptions.USE_CASE:
        return 'purple';
      default:
        return 'blue';
    }
  };

  // Helper function to safely get filter type
  const getFilterType = (key: string): AIAssetsFilterOptions => {
    if (key === AIAssetsFilterOptions.NAME) {
      return AIAssetsFilterOptions.NAME;
    }
    if (key === AIAssetsFilterOptions.KEYWORD) {
      return AIAssetsFilterOptions.KEYWORD;
    }
    if (key === AIAssetsFilterOptions.USE_CASE) {
      return AIAssetsFilterOptions.USE_CASE;
    }
    return AIAssetsFilterOptions.NAME; // fallback
  };

  // Get active filters for display
  const activeFilters = Object.entries(filterData).filter(([, value]) => value && value !== '');

  const startItem = (page - 1) * perPage + 1;
  const endItem = Math.min(page * perPage, itemCount);

  return (
    <Toolbar data-testid="ai-assets-filter-toolbar">
      <ToolbarContent>
        {/* Left side - Filter dropdown and search */}
        <ToolbarGroup variant="filter-group">
          <ToolbarItem>
            <Dropdown
              onOpenChange={(isOpen) => setIsFilterDropdownOpen(isOpen)}
              shouldFocusToggleOnSelect
              toggle={(toggleRef) => (
                <MenuToggle
                  data-testid="filter-dropdown"
                  ref={toggleRef}
                  aria-label="Filter toggle"
                  onClick={handleFilterDropdownToggle}
                  isExpanded={isFilterDropdownOpen}
                  icon={<FilterIcon />}
                >
                  {aiAssetsFilterOptions[currentFilterType]}
                </MenuToggle>
              )}
              isOpen={isFilterDropdownOpen}
              popperProps={{ appendTo: 'inline' }}
            >
              <DropdownList>
                {Object.entries(aiAssetsFilterOptions).map(([key, label]) => (
                  <DropdownItem
                    key={key}
                    id={key}
                    onClick={() => {
                      setIsFilterDropdownOpen(false);
                      setCurrentFilterType(getFilterType(key));
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
              aria-label={`Filter by ${aiAssetsFilterOptions[currentFilterType].toLowerCase()}`}
              placeholder={`Filter by ${aiAssetsFilterOptions[currentFilterType].toLowerCase()}...`}
              value={searchValue}
              onChange={(_event, value) => handleSearchChange(value || '')}
              onSearch={handleSearch}
            />
          </ToolbarItem>
        </ToolbarGroup>

        {/* Middle - Pagination info */}
        <ToolbarGroup>
          <ToolbarItem>
            <span style={{ fontSize: 'var(--pf-t--global--font--size--body--default)' }}>
              {startItem}-{endItem} of {itemCount}
            </span>
          </ToolbarItem>
        </ToolbarGroup>

        {/* Right side - Active filters and Don't see model button */}
        <ToolbarGroup variant="action-group">
          <ToolbarItem>
            <Popover
              position="bottom"
              showClose
              hasAutoWidth
              maxWidth="332px"
              headerContent={
                <div style={{ padding: '16px 16px 0 16px' }}>
                  To make a model deployment available:
                </div>
              }
              bodyContent={
                <div style={{ padding: '0 16px 16px 16px' }}>
                  <Content component="ol">
                    <Content component="li">
                      Go to your <strong>model deployments</strong> page
                    </Content>
                    <Content component="li">
                      Select &apos;<strong>Edit</strong>&apos; to update your deployment
                    </Content>
                    <Content component="li">
                      Check the box: &apos;
                      <strong>Make this deployment available as an AI Asset</strong>&apos;
                    </Content>
                  </Content>
                </div>
              }
            >
              <Button variant={ButtonVariant.link} data-testid="dont-see-model-button">
                Don&apos;t see the model you&apos;re looking for?
              </Button>
            </Popover>
          </ToolbarItem>
          {/* Active filters */}
          {activeFilters.length > 0 && (
            <ToolbarItem>
              <Flex gap={{ default: 'gapSm' }} wrap="wrap">
                {activeFilters.map(([filterType, value]) => {
                  const displayValue =
                    typeof value === 'string' ? value : value?.label || value?.value || '';
                  return (
                    <FlexItem key={filterType}>
                      <Label
                        color={getLabelColor(filterType)}
                        onClose={() => handleRemoveFilter(getFilterType(filterType))}
                        closeBtnProps={{
                          'aria-label': `Remove ${aiAssetsFilterOptions[getFilterType(filterType)]} filter`,
                        }}
                      >
                        {aiAssetsFilterOptions[getFilterType(filterType)]}: {displayValue}
                      </Label>
                    </FlexItem>
                  );
                })}
                <FlexItem>
                  <Button
                    variant={ButtonVariant.link}
                    onClick={onClearFilters}
                    style={{
                      padding: 0,
                      fontSize: 'var(--pf-t--global--font--size--body--default)',
                    }}
                  >
                    Clear all filters
                  </Button>
                </FlexItem>
              </Flex>
            </ToolbarItem>
          )}
        </ToolbarGroup>
      </ToolbarContent>
    </Toolbar>
  );
};

export default AIAssetsFilterToolbar;
