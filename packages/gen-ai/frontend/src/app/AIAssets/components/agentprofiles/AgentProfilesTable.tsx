import * as React from 'react';
import {
  Button,
  ButtonVariant,
  Dropdown,
  DropdownItem,
  DropdownList,
  Flex,
  FlexItem,
  Label,
  MenuToggle,
  SearchInput,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { CloseIcon, FilterIcon } from '@patternfly/react-icons';
import { Table, DashboardEmptyTableView } from 'mod-arch-shared';
import { AgentProfileSummary } from '~/app/agentProfile/types';
import AgentProfileTableRow from './AgentProfileTableRow';
import AgentProfileColumns from './AgentProfileColumns';

const FILTER_KEYS = ['name', 'description'] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

const FILTER_LABELS: Record<FilterKey, string> = {
  name: 'Name',
  description: 'Description',
};

type FilterData = Record<FilterKey, string | undefined>;

const INITIAL_FILTER: FilterData = { name: undefined, description: undefined };

type AgentProfilesTableProps = {
  profiles: AgentProfileSummary[];
  onDelete: (profileId: string) => Promise<void>;
  onRefresh: () => void;
};

const AgentProfilesTable: React.FC<AgentProfilesTableProps> = ({
  profiles,
  onDelete,
  onRefresh,
}) => {
  const [filterData, setFilterData] = React.useState<FilterData>(INITIAL_FILTER);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = React.useState(false);
  const [currentFilterKey, setCurrentFilterKey] = React.useState<FilterKey>('name');
  const [searchValue, setSearchValue] = React.useState('');

  const onFilterUpdate = React.useCallback((key: FilterKey, value: string | undefined) => {
    setFilterData((prev) => ({ ...prev, [key]: value || undefined }));
  }, []);

  const onClearFilters = React.useCallback(() => {
    setFilterData(INITIAL_FILTER);
    setSearchValue('');
  }, []);

  const filteredProfiles = React.useMemo(
    () =>
      profiles.filter((p) => {
        if (
          filterData.name &&
          !p.displayName.toLowerCase().includes(filterData.name.toLowerCase())
        ) {
          return false;
        }
        if (
          filterData.description &&
          !(p.description ?? '').toLowerCase().includes(filterData.description.toLowerCase())
        ) {
          return false;
        }
        return true;
      }),
    [profiles, filterData],
  );

  const activeFilters = FILTER_KEYS.filter((key) => filterData[key] != null);

  const toolbar = (
    <Toolbar data-testid="agent-profiles-table-toolbar">
      <ToolbarContent>
        <ToolbarGroup variant="filter-group">
          <ToolbarItem>
            <Dropdown
              isOpen={isFilterDropdownOpen}
              onOpenChange={setIsFilterDropdownOpen}
              shouldFocusToggleOnSelect
              toggle={(ref) => (
                <MenuToggle
                  ref={ref}
                  aria-label="Filter by"
                  onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
                  isExpanded={isFilterDropdownOpen}
                  icon={<FilterIcon />}
                >
                  {FILTER_LABELS[currentFilterKey]}
                </MenuToggle>
              )}
              popperProps={{ appendTo: 'inline' }}
            >
              <DropdownList>
                {FILTER_KEYS.map((key) => (
                  <DropdownItem
                    key={key}
                    onClick={() => {
                      setIsFilterDropdownOpen(false);
                      setCurrentFilterKey(key);
                      setSearchValue('');
                    }}
                  >
                    {FILTER_LABELS[key]}
                  </DropdownItem>
                ))}
              </DropdownList>
            </Dropdown>
          </ToolbarItem>
          <ToolbarItem>
            <SearchInput
              placeholder={`Filter by ${FILTER_LABELS[currentFilterKey].toLowerCase()}...`}
              value={searchValue}
              onChange={(_e, val) => setSearchValue(val)}
              onSearch={() => onFilterUpdate(currentFilterKey, searchValue)}
              onClear={() => {
                setSearchValue('');
                onFilterUpdate(currentFilterKey, undefined);
              }}
              data-testid="agent-profiles-search-input"
            />
          </ToolbarItem>
        </ToolbarGroup>
      </ToolbarContent>
      {activeFilters.length > 0 && (
        <ToolbarContent>
          <ToolbarGroup>
            <ToolbarItem>
              <Flex gap={{ default: 'gapSm' }} wrap="wrap">
                {activeFilters.map((key) => (
                  <FlexItem key={key}>
                    <Label
                      color="blue"
                      onClose={() => onFilterUpdate(key, undefined)}
                      closeBtnProps={{ 'aria-label': `Remove ${FILTER_LABELS[key]} filter` }}
                    >
                      {FILTER_LABELS[key]}: {filterData[key]}
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

  return (
    <Table
      data={filteredProfiles}
      columns={AgentProfileColumns}
      enablePagination
      defaultSortColumn={2}
      emptyTableView={<DashboardEmptyTableView onClearFilters={onClearFilters} />}
      rowRenderer={(profile: AgentProfileSummary) => (
        <AgentProfileTableRow
          key={profile.profileId}
          profile={profile}
          onDelete={onDelete}
          onRefresh={onRefresh}
        />
      )}
      toolbarContent={toolbar}
      onClearFilters={onClearFilters}
      data-testid="agent-profiles-table"
    />
  );
};

export default AgentProfilesTable;
