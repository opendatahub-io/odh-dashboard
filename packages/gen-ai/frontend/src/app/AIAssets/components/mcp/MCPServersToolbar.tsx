import * as React from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { PlayIcon, FilterIcon, CloseIcon } from '@patternfly/react-icons';
import { genAiChatPlaygroundRoute } from '~/app/utilities';
import { MCPFilterColors } from '~/app/AIAssets/data/mcpFilterOptions';

interface MCPServersToolbarProps {
  onFilterUpdate: (filterType: string, value?: string) => void;
  filterData: Record<string, string | undefined>;
  filterOptions: Record<string, string>;
  filterColors?: Record<string, MCPFilterColors>;
  selectedCount: number;
  selectedServerIds: string[];
  onClearFilters: () => void;
}

const MCPServersToolbar: React.FC<MCPServersToolbarProps> = ({
  onFilterUpdate,
  filterData,
  filterOptions,
  filterColors,
  selectedCount,
  selectedServerIds,
  onClearFilters,
}) => {
  const navigate = useNavigate();
  const { namespace } = useParams<{ namespace: string }>();
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = React.useState(false);
  const [currentFilterType, setCurrentFilterType] = React.useState<string>(() => {
    const keys = Object.keys(filterOptions);
    return keys[0];
  });
  const [searchValue, setSearchValue] = React.useState('');

  const handleTryInPlayground = React.useCallback(() => {
    navigate(genAiChatPlaygroundRoute(namespace), {
      state: {
        mcpServers: selectedServerIds,
      },
    });
  }, [selectedServerIds, namespace, navigate]);

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
              onChange={(_event, value) => setSearchValue(value || '')}
              onSearch={() => onFilterUpdate(currentFilterType, searchValue)}
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
                        onClose={() => onFilterUpdate(filterType, '')}
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
