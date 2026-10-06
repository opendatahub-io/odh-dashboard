// Modules -------------------------------------------------------------------->

import React from 'react';
import {
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
  ToolbarItem,
} from '@patternfly/react-core';
import {
  ToolbarFilter,
  type FilterConfigMap,
  type FilterState,
  type FilterValue,
} from 'mod-arch-shared';

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

type FilterOption = 'capability' | 'labels';

// Globals -------------------------------------------------------------------->

const capabilityFilters = {
  full_integration: {
    value: 'full_integration',
    label: 'Full integration',
  },
  credentials: {
    value: 'credentials',
    label: 'Credentials only',
  },
};

const mockLabels = [
  {
    value: 'label-01',
    label: 'Label 01',
  },
  {
    value: 'label-02',
    label: 'Label 02',
  },
  {
    value: 'label-03',
    label: 'Label 03',
  },
  {
    value: 'label-04',
    label: 'Label 04',
  },
  {
    value: 'label-05',
    label: 'Label 05',
  },
];

const filterConfig: FilterConfigMap<FilterOption> = {
  capability: {
    type: 'select',
    label: 'Capability',
    placeholder: 'Filter by capability',
    options: Object.values(capabilityFilters),
  },
  labels: {
    type: 'multiselect',
    label: 'Labels',
    placeholder: 'Filter by labels',
    options: mockLabels,
  },
};

const visibleFilterKeys = ['capability', 'labels'] as const;

const initialFilterValues: FilterState<FilterOption> = {
  capability: '',
  labels: [],
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
  // State -------------------------------------------------------------------->

  const initialSelectedFilters = Object.keys(defaults.filter.sections).reduce<SelectedFilters>(
    (acc, cur) => {
      acc[cur] = null;
      return acc;
    },
    {},
  );
  const [selectedFilters, setSelectedFilters] = React.useState(initialSelectedFilters);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [filterValues, setFilterValues] =
    React.useState<FilterState<FilterOption>>(initialFilterValues);
  const selectedConnectionGroup =
    typeof filterValues.capability === 'string' &&
    (filterValues.capability === 'full_integration' || filterValues.capability === 'credentials')
      ? filterValues.capability
      : null;

  // Callbacks ---------------------------------------------------------------->

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

  const onFilterChange = React.useCallback((filterKey: FilterOption, value: FilterValue) => {
    setFilterValues((previousFilterValues) => ({
      ...previousFilterValues,
      [filterKey]: value,
    }));
  }, []);

  const onClearAllFilters = React.useCallback(() => setFilterValues(initialFilterValues), []);

  // Helpers ------------------------------------------------------------------>

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

  // Rendering ---------------------------------------------------------------->

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

  const toolbar = (
    <ToolbarFilter
      filterConfig={filterConfig}
      visibleFilterKeys={visibleFilterKeys}
      filterValues={filterValues}
      onFilterChange={onFilterChange}
      onClearAllFilters={onClearAllFilters}
      testIdPrefix="connection-types-gallery"
      toolbarActions={
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
      }
    />
  );

  const galleryCards = Object.values(defaults.toolbar.groups)
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
    ));

  const emptyState = (
    <EmptyState
      headingLevel="h3"
      icon={() => <img src={emptyStateImage} alt="" width={108} height={108} />}
      titleText="No matching data connection types"
    >
      <EmptyStateBody>No data connection types match your search or filter</EmptyStateBody>
    </EmptyState>
  );

  return (
    <>
      <Sidebar hasBorder hasGutter>
        {localFeatureFlags.filters ? sidebarPanel : null}
        <SidebarContent>
          <Stack>
            <StackItem>{toolbar}</StackItem>
            <StackItem>{galleryCards}</StackItem>
          </Stack>
        </SidebarContent>
      </Sidebar>
      {shouldRenderEmptySearchState && emptyState}
    </>
  );
};

// Public --------------------------------------------------------------------->

export default ConnectionTypesGallery;
