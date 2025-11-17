import * as React from 'react';
import { useNavigate } from 'react-router-dom';
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
import { PlayIcon, FilterIcon, SyncAltIcon, CloseIcon } from '@patternfly/react-icons';
import { chatPlaygroundRootPath } from '~/app/utilities';
import { MCPFilterColors } from '~/app/AIAssets/data/mcpFilterOptions';

interface MCPServersToolbarProps {
  onFilterUpdate: (filterType: string, value?: string) => void;
  filterData: Record<string, string | undefined>;
  filterOptions: Record<string, string>;
  filterColors?: Record<string, MCPFilterColors>;
  selectedCount: number;
  selectedServerIds: string[];
  onTryInPlayground: (serverIds: string[]) => void;
  onRefresh?: () => void;
  onClearFilters: () => void;
}

const MCPServersToolbar: React.FC<MCPServersToolbarProps> = ({
  onFilterUpdate,
  filterData,
  filterOptions,
  filterColors,
  selectedCount,
  selectedServerIds,
  onTryInPlayground,
  onRefresh,
  onClearFilters,
}) => {
  const navigate = useNavigate();
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = React.useState(false);
  const [currentFilterType, setCurrentFilterType] = React.useState<string>(() => {
    const keys = Object.keys(filterOptions);
    return keys[0];
  });
  const [searchValue, setSearchValue] = React.useState('');

  const handleSearch = () => {
    onFilterUpdate(currentFilterType, searchValue);
  };

  const handleSearchChange = (value: string) => {
    setSearchValue(value);
  };

  const handleRemoveFilter = (filterType: string) => {
    onFilterUpdate(filterType, '');
  };

  const handleTryInPlayground = React.useCallback(() => {
    // Save selections to playground and navigate
    onTryInPlayground(selectedServerIds);
    navigate(chatPlaygroundRootPath);
  }, [selectedServerIds, onTryInPlayground, navigate]);

  // Get active filters for display
  const activeFilters = Object.entries(filterData).filter(([, value]) => value && value !== '');

  // Get label color based on filter type
  const getLabelColor = (filterType: string): MCPFilterColors =>
    filterColors?.[filterType] ?? MCPFilterColors.NAME;

  return (
    <Toolbar data-testid="mcp-servers-table-toolbar">
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

        <ToolbarGroup variant="action-group">
          <ToolbarItem>
            <Button
              variant="primary"
              icon={<PlayIcon />}
              onClick={handleTryInPlayground}
              isDisabled={selectedCount === 0}
              data-testid="try-in-playground-button"
            >
              Try in Playground{selectedCount > 0 ? ` (${selectedCount})` : ''}
            </Button>
          </ToolbarItem>
          {onRefresh && (
            <ToolbarItem>
              <Button
                variant="link"
                icon={<SyncAltIcon />}
                onClick={onRefresh}
                aria-label="Refresh MCP servers and connection status"
              >
                Refresh
              </Button>
            </ToolbarItem>
          )}
        </ToolbarGroup>
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

export default MCPServersToolbar;
