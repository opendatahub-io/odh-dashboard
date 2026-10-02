/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable no-console */

// Modules -------------------------------------------------------------------->

import React from 'react';
import {
  Button,
  Checkbox,
  Content,
  EmptyState,
  EmptyStateBody,
  Gallery,
  SearchInput,
  Sidebar,
  SidebarContent,
  SidebarPanel,
  Stack,
  StackItem,
  Title,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
} from '@patternfly/react-core';
import FilterToolbar from '@odh-dashboard/ui-core/components/FilterToolbar';
import {
  MultiSelection,
  type SelectionOptions,
} from '@odh-dashboard/ui-core/components/MultiSelection';

import { ConnectionTypeCard, ConnectionTypeCardIdentifier } from '~/app/components/ConnectionType';
import type {
  Identified,
  Labelled,
  Described,
  ConnectionType,
  ConnectionTypeGroup,
} from '~/app/types';

import emptyStateImage from '~/images/RHOAI-Noconnections-RGB.svg';

// Types ---------------------------------------------------------------------->

type FilterItem = Identified<string> & Labelled<string>;

type FilterItems = Record<string, FilterItem>;

type SelectedFilters = Record<string, string | null>;

type ConnectionGroup = Identified<ConnectionTypeGroup> &
  Labelled<string> &
  Described<string> & {
    renderGroupSection?: boolean;
  };

type FilterOptionRenders = {
  onChange: (value?: string, label?: string) => void;
  value?: string;
  label?: string;
};

// Globals -------------------------------------------------------------------->

const FILTER_OPTIONS = {
  term: 'Term',
  value: 'Value',
};

const categoriesFilter: FilterItems = {
  data_warehouse: { id: 'data_warehouse', label: 'Data warehouse' },
  database: { id: 'database', label: 'Database' },
  general: { id: 'general', label: 'General' },
  object_storage: { id: 'object_storage', label: 'Object storage' },
};

const licensesFilter: FilterItems = {
  apache_20: { id: 'apache_20', label: 'Apache 2.0' },
  gpl_20: { id: 'gpl_20', label: 'GPL 2.0' },
  mit: { id: 'mit', label: 'MIT' },
  postgresql_license: { id: 'postgresql_license', label: 'PostgreSQL License' },
  proprietary: { id: 'proprietary', label: 'Proprietary' },
};

const connectionGroups: Record<ConnectionTypeGroup, ConnectionGroup> = {
  full_integration: {
    id: 'full_integration',
    label: 'Full integration',
    description: 'Connection types with credential management and data ingestion support.',
  },
  credentials: {
    id: 'credentials',
    label: 'Credentials only',
    description:
      'Connection types that store credentials for authentication without built-in ingestion.',
  },
};

const localFeatureFlags = {
  filters: false,
};

const defaults = {
  filter: {
    sections: {
      categories: { id: 'categories', label: 'Category', items: categoriesFilter },
      licenses: { id: 'licenses', label: 'License', items: licensesFilter },
    },
  },
  toolbar: {
    groups: connectionGroups,
  },
};

// Private -------------------------------------------------------------------->

// Components ----------------------------------------------------------------->

type ConnectionTypesGalleryProps = {
  connectionTypes: ConnectionType[];
  onConnectionTypeClick: (connectionType: ConnectionType) => void;
  isSelectable?: boolean;
  selectedConnectionTypeId?: string;
};
const ConnectionTypesGallery: React.FC<ConnectionTypesGalleryProps> = ({
  connectionTypes,
  onConnectionTypeClick,
  isSelectable = false,
  selectedConnectionTypeId,
}) => {
  const initialSelectedFilters = Object.keys(defaults.filter.sections).reduce<SelectedFilters>(
    (acc, cur) => {
      acc[cur] = null;
      return acc;
    },
    {},
  );
  const [selectedFilters, setSelectedFilters] = React.useState(initialSelectedFilters);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [selectedConnectionGroup, setSelectedConnectionGroup] =
    React.useState<ConnectionTypeGroup | null>(null);
  const [toolbarFilters, setToolbarFilters] = React.useState({
    term: null,
    values: [],
  });

  const shouldShowConnectionType = React.useCallback(
    (connectionType: ConnectionType) => {
      const normalizedSearchTerm = searchTerm.trim().toLowerCase();
      if (normalizedSearchTerm) {
        const searchableText = `${connectionType.resource.name} ${
          connectionType.resource.description ?? ''
        }`
          .trim()
          .toLowerCase();
        return searchableText.includes(normalizedSearchTerm);
      }
      return true;
    },
    [searchTerm],
  );

  const connectionTypesByGroup = React.useMemo<
    Record<ConnectionTypeGroup, ConnectionType[]>
  >(() => {
    const groupedConnectionTypes: Record<ConnectionTypeGroup, ConnectionType[]> = {
      full_integration: [],
      credentials: [],
    };

    connectionTypes.forEach((connectionType) => {
      if (connectionType.status?.capabilities.flight) {
        groupedConnectionTypes.full_integration.push(connectionType);
      } else {
        groupedConnectionTypes.credentials.push(connectionType);
      }
    });

    return groupedConnectionTypes;
  }, [connectionTypes]);

  const connectionTypesByGroupToRender = React.useMemo<
    Record<ConnectionTypeGroup, ConnectionType[]>
  >(() => {
    const filteredConnectionTypes: Record<ConnectionTypeGroup, ConnectionType[]> = {
      full_integration: [],
      credentials: [],
    };
    Object.values(connectionGroups).forEach(({ id: connectionTypeGroup }) => {
      filteredConnectionTypes[connectionTypeGroup] =
        connectionTypesByGroup[connectionTypeGroup].filter(shouldShowConnectionType);
    });
    return filteredConnectionTypes;
  }, [connectionTypesByGroup, shouldShowConnectionType]);

  const shouldRenderEmptySearchState =
    Boolean(searchTerm) &&
    Object.values(connectionTypesByGroupToRender).every(
      (renderedConnectionTypes) => renderedConnectionTypes.length === 0,
    );

  const handleFilterChange = (filter: string, selections: SelectionOptions[]) => null;

  const filterOptionRenders: Record<string, (props: FilterOptionRenders) => React.ReactNode> = {
    term: () => (
      <MultiSelection
        value={[
          {
            id: 'capability',
            name: 'Capability',
          },
          {
            id: 'labels',
            name: 'Labels',
          },
        ]}
        setValue={(selections: SelectionOptions[]) => handleFilterChange('term', selections)}
        placeholder={'Select the term'}
        ariaLabel="Connection type filter term"
        isDisabled={false}
      />
    ),
    value: () => (
      <MultiSelection
        value={[
          {
            id: 'capability',
            name: 'Capability',
          },
          {
            id: 'labels',
            name: 'Labels',
          },
        ]}
        setValue={(selections: SelectionOptions[]) => handleFilterChange('value', selections)}
        placeholder={'Select the value'}
        ariaLabel="Connection type filter value"
        isDisabled={false}
      />
    ),
  };
  const searchFilters: Record<string, string[]> = {};
  const filterData = {
    term: searchFilters.term?.join(', '),
    value: searchFilters.value?.join(', '),
  };
  const currentFilterType = 'term';

  const sidebarPanel = (
    <SidebarPanel>
      {Object.values(defaults.filter.sections).map((section, sectionIndex, sectionsList) => (
        <React.Fragment key={`ConnectionTypesGallery-sidebar-filter-section--${section.id}`}>
          <Title className="pf-v6-u-mb-sm" headingLevel="h4">
            {section.label}
          </Title>
          {Object.values(section.items).map((sectionItem) => (
            <Checkbox
              key={`ConnectionTypesGallery-sidebar-filter-checkbox--${section.id}::${sectionItem.id}`}
              id={`ConnectionTypesGallery-sidebar-filter-checkbox--${section.id}::${sectionItem.id}`}
              name={sectionItem.id}
              label={sectionItem.label}
              isChecked={selectedFilters[section.id] === sectionItem.id}
              onChange={(_event, checked) => {
                setSelectedFilters((previousSelectedFilters) => ({
                  ...previousSelectedFilters,
                  [section.id]: checked ? sectionItem.id : null,
                }));
              }}
            />
          ))}
          {sectionIndex !== sectionsList.length - 1 ? (
            <div
              style={{
                borderBottom:
                  'var(--pf-t--global--border--width--divider--default) solid var(--pf-t--global--border--color--default)',
                paddingBottom: 'var(--pf-t--global--spacer--md)',
                marginBottom: 'var(--pf-t--global--spacer--md)',
              }}
            />
          ) : null}
        </React.Fragment>
      ))}
    </SidebarPanel>
  );

  return (
    <>
      <Sidebar hasBorder hasGutter>
        {localFeatureFlags.filters ? sidebarPanel : null}
        <SidebarContent>
          <Stack>
            <Toolbar
              id="ConnectionTypesGallery-toolbar"
              className="pf-m-toggle-group-container"
              collapseListedFiltersBreakpoint="xl"
              customLabelGroupContent={
                <>
                  <ToolbarItem>
                    <Button
                      variant="link"
                      isInline
                      onClick={() => {
                        console.log('Implement Clear all filters');
                      }}
                    >
                      Clear all filters
                    </Button>
                  </ToolbarItem>
                </>
              }
            >
              <ToolbarContent>
                <FilterToolbar
                  key="lineage-filters"
                  filterOptions={FILTER_OPTIONS}
                  filterOptionRenders={filterOptionRenders}
                  filterData={filterData}
                  onFilterUpdate={() => null}
                  currentFilterType={currentFilterType}
                  onFilterTypeChange={() => null}
                  testId="lineage-search-filter"
                />
                <ToolbarItem>
                  <SearchInput
                    name="ConnectionTypesGallery-toolbar-search"
                    aria-label="Search data connection types by name"
                    placeholder="Search by name or description..."
                    value={searchTerm}
                    onChange={(_event, value) => setSearchTerm(value)}
                    onClear={() => setSearchTerm('')}
                  />
                </ToolbarItem>
              </ToolbarContent>
            </Toolbar>

            {Object.values(defaults.toolbar.groups)
              .filter((group) => group.renderGroupSection !== false)
              .filter((group) => connectionTypesByGroupToRender[group.id].length)
              .filter((group) => !selectedConnectionGroup || group.id === selectedConnectionGroup)
              .map((group) => (
                <React.Fragment key={group.id}>
                  <Title headingLevel="h3">{group.label}</Title>
                  <Content component="p" className="pf-v6-u-mb-sm pf-v6-u-mt-sm">
                    {group.description}
                  </Content>
                  <Gallery hasGutter maxWidths={{ default: '350px' }} className="pf-v6-u-mb-lg">
                    {connectionTypesByGroupToRender[group.id].map((connectionType) => (
                      <ConnectionTypeCard
                        key={ConnectionTypeCardIdentifier(connectionType.metadata.id)}
                        connectionType={connectionType}
                        isSelectable={isSelectable}
                        isSelected={connectionType.metadata.id === selectedConnectionTypeId}
                        onClick={() => onConnectionTypeClick(connectionType)}
                      />
                    ))}
                  </Gallery>
                </React.Fragment>
              ))}
          </Stack>
        </SidebarContent>
      </Sidebar>
      {shouldRenderEmptySearchState && (
        <EmptyState
          headingLevel="h3"
          icon={() => <img src={emptyStateImage} alt="" width={108} height={108} />}
          titleText="No matching data connection types"
        >
          <EmptyStateBody>No data connection types match your search or filter</EmptyStateBody>
        </EmptyState>
      )}
    </>
  );
};

// Public --------------------------------------------------------------------->

export default ConnectionTypesGallery;
