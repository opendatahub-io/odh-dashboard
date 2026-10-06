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
  ToggleGroup,
  ToggleGroupItem,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
} from '@patternfly/react-core';
import { CloseIcon, FilterIcon } from '@patternfly/react-icons';
import { Table, DashboardEmptyTableView } from 'mod-arch-shared';
import { AgentDeploymentSummary, AgentProfileSummary } from '~/app/agentProfile/types';
import useGenAiAgentDeploymentEnabled from '~/app/hooks/useGenAiAgentDeploymentEnabled';
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
  deployments: AgentDeploymentSummary[];
  deploymentsLoaded: boolean;
  onDelete: (profileId: string) => Promise<void>;
  onRefresh: () => void;
};

type DeploymentFilter = 'all' | 'deployed' | 'not-deployed';

const AgentProfilesTable: React.FC<AgentProfilesTableProps> = ({
  profiles,
  deployments,
  deploymentsLoaded,
  onDelete,
  onRefresh,
}) => {
  const [filterData, setFilterData] = React.useState<FilterData>(INITIAL_FILTER);
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = React.useState(false);
  const [currentFilterKey, setCurrentFilterKey] = React.useState<FilterKey>('name');
  const [searchValue, setSearchValue] = React.useState('');
  const [deploymentFilter, setDeploymentFilter] = React.useState<DeploymentFilter>('all');
  const { enabled: isAgentDeploymentEnabled, loaded: agentDeploymentAvailabilityLoaded } =
    useGenAiAgentDeploymentEnabled();
  const columns = React.useMemo(
    () => AgentProfileColumns(isAgentDeploymentEnabled),
    [isAgentDeploymentEnabled],
  );
  const lastModifiedColumnIndex = columns.findIndex((column) => column.field === 'lastModified');

  const onFilterUpdate = React.useCallback((key: FilterKey, value: string | undefined) => {
    setFilterData((prev) => ({ ...prev, [key]: value || undefined }));
  }, []);

  const onClearFilters = React.useCallback(() => {
    setFilterData(INITIAL_FILTER);
    setSearchValue('');
  }, []);

  const deployedProfileIds = React.useMemo(
    () => new Set(deployments.map((deployment) => deployment.agentProfileId)),
    [deployments],
  );
  const deploymentsByProfileId = React.useMemo(() => {
    const byProfileId = new Map<string, AgentDeploymentSummary[]>();
    deployments.forEach((deployment) => {
      const profileDeployments = byProfileId.get(deployment.agentProfileId);
      if (profileDeployments) {
        profileDeployments.push(deployment);
      } else {
        byProfileId.set(deployment.agentProfileId, [deployment]);
      }
    });
    return byProfileId;
  }, [deployments]);
  const deployedProfileCount = React.useMemo(
    () => profiles.filter((profile) => deployedProfileIds.has(profile.profileId)).length,
    [deployedProfileIds, profiles],
  );

  const filteredProfiles = React.useMemo(
    () =>
      profiles.filter((p) => {
        if (deploymentFilter === 'deployed' && !deployedProfileIds.has(p.profileId)) {
          return false;
        }
        if (deploymentFilter === 'not-deployed' && deployedProfileIds.has(p.profileId)) {
          return false;
        }
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
    [profiles, filterData, deploymentFilter, deployedProfileIds],
  );

  const activeFilters = FILTER_KEYS.filter((key) => filterData[key] != null);

  const toolbar = (
    <Toolbar data-testid="agent-profiles-table-toolbar">
      <ToolbarContent>
        <ToolbarGroup variant="filter-group">
          {isAgentDeploymentEnabled && (
            <ToolbarItem className="pf-v6-u-mr-sm">
              <ToggleGroup
                aria-label="Agent deployment filters"
                data-testid="agent-deployment-filters"
              >
                <ToggleGroupItem
                  text={`All (${profiles.length})`}
                  isSelected={deploymentFilter === 'all'}
                  onChange={() => setDeploymentFilter('all')}
                  data-testid="agent-deployment-filter-all"
                />
                <ToggleGroupItem
                  text={`Deployed (${deployedProfileCount})`}
                  isSelected={deploymentFilter === 'deployed'}
                  onChange={() => setDeploymentFilter('deployed')}
                  data-testid="agent-deployment-filter-deployed"
                />
                <ToggleGroupItem
                  text={`Not deployed (${profiles.length - deployedProfileCount})`}
                  isSelected={deploymentFilter === 'not-deployed'}
                  onChange={() => setDeploymentFilter('not-deployed')}
                  data-testid="agent-deployment-filter-not-deployed"
                />
              </ToggleGroup>
            </ToolbarItem>
          )}
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

  if (!agentDeploymentAvailabilityLoaded) {
    return (
      <Table
        key="agent-profiles-loading"
        data={profiles}
        columns={AgentProfileColumns(false)}
        enablePagination
        defaultSortColumn={2}
        loading
        rowRenderer={() => null}
        data-testid="agent-profiles-table"
      />
    );
  }

  return (
    <Table
      key={
        isAgentDeploymentEnabled
          ? 'agent-profiles-with-endpoints'
          : 'agent-profiles-without-endpoints'
      }
      data={filteredProfiles}
      columns={columns}
      enablePagination
      defaultSortColumn={lastModifiedColumnIndex}
      emptyTableView={<DashboardEmptyTableView onClearFilters={onClearFilters} />}
      rowRenderer={(profile: AgentProfileSummary) => (
        <AgentProfileTableRow
          key={profile.profileId}
          profile={profile}
          deployments={deploymentsByProfileId.get(profile.profileId) ?? []}
          deploymentsLoading={isAgentDeploymentEnabled && !deploymentsLoaded}
          onDelete={onDelete}
          onRefresh={onRefresh}
          showEndpointsColumn={isAgentDeploymentEnabled}
        />
      )}
      toolbarContent={toolbar}
      onClearFilters={onClearFilters}
      data-testid="agent-profiles-table"
    />
  );
};

export default AgentProfilesTable;
