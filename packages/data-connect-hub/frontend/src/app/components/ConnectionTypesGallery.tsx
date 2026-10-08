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

import {
  type ConnectionTypeCapability,
  ConnectionTypeCapabilities,
  ConnectionTypeInstance,
  ConnectionTypeCard,
  ConnectionTypeCardIdentifier,
} from '~/app/components/ConnectionType';
import type { Identified, Labelled, ConnectionType } from '~/app/types';
import { IdentifiedLabelledToValuedLabelled } from '~/app/types';

import emptyStateImage from '~/images/RHOAI-Noconnections-RGB.svg';

import './ConnectionTypesGallery.scss';

// Types ---------------------------------------------------------------------->

type FilterItem = Identified<string> & Labelled<string>;

type FilterItems = Record<string, FilterItem>;

type SelectedFilters = Record<string, string | null>;

type FilterOption = 'capability' | 'labels';

// Globals -------------------------------------------------------------------->

const capabilityFilters = {
  ...IdentifiedLabelledToValuedLabelled(ConnectionTypeCapabilities.full_integration),
  ...IdentifiedLabelledToValuedLabelled(ConnectionTypeCapabilities.credentials),
};

const localFeatureFlags = {
  filters: false,
  tags: false,
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

const visibleFilterKeys: FilterOption[] = localFeatureFlags.tags
  ? ['capability', 'labels']
  : ['capability'];

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

const defaults = {
  filter: {
    sections: {
      categories: { id: 'categories', label: 'Category', items: categoriesFilter },
      licenses: { id: 'licenses', label: 'License', items: licensesFilter },
    },
  },
  toolbar: {
    groups: ConnectionTypeCapabilities,
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

  const normalizedSearchTerm = React.useMemo<string>(
    () => searchTerm.trim().toLowerCase(),
    [searchTerm],
  );

  const shouldShowConnectionType = React.useCallback(
    (connectionType: ConnectionTypeInstance) => {
      let shouldRenderConnectionType = true;

      if (normalizedSearchTerm) {
        shouldRenderConnectionType = connectionType.matchesSearch(normalizedSearchTerm);
      }
      if (localFeatureFlags.tags && filterValues.labels.length) {
        shouldRenderConnectionType =
          shouldRenderConnectionType && connectionType.matchesLabels(filterValues.labels);
      }
      return shouldRenderConnectionType;
    },
    [normalizedSearchTerm, filterValues],
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
    Record<ConnectionTypeCapability, ConnectionTypeInstance[]>
  >(() => {
    const groupedConnectionTypes: Record<ConnectionTypeCapability, ConnectionTypeInstance[]> = {
      full_integration: [],
      credentials: [],
    };

    connectionTypes
      .map((connectionType) => new ConnectionTypeInstance(connectionType))
      .forEach((connectionType) => {
        if (connectionType.isFullIntegration()) {
          groupedConnectionTypes.full_integration.push(connectionType);
        } else {
          groupedConnectionTypes.credentials.push(connectionType);
        }
      });

    return groupedConnectionTypes;
  }, [connectionTypes]);

  const connectionTypesByGroupToRender = React.useMemo<
    Record<ConnectionTypeCapability, ConnectionTypeInstance[]>
  >(() => {
    const filteredConnectionTypes: Record<ConnectionTypeCapability, ConnectionTypeInstance[]> = {
      full_integration: [],
      credentials: [],
    };
    Object.values(ConnectionTypeCapabilities).forEach(({ id: connectionTypeGroup }) => {
      filteredConnectionTypes[connectionTypeGroup] =
        connectionTypesByGroup[connectionTypeGroup].filter(shouldShowConnectionType);
    });
    return filteredConnectionTypes;
  }, [connectionTypesByGroup, shouldShowConnectionType]);

  const hasFilters =
    Boolean(filterValues.capability) ||
    (localFeatureFlags.tags && Boolean(filterValues.labels.length));

  const shouldRenderGroupTitles = !hasFilters && !normalizedSearchTerm;

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
            <div className="dch-connection-types-gallery__filter-separator" />
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
            placeholder="Find by name or description..."
            value={searchTerm}
            onChange={(_event, value) => setSearchTerm(value)}
            onClear={() => setSearchTerm('')}
          />
        </ToolbarItem>
      }
    />
  );

  const galleryCards = Object.values(defaults.toolbar.groups)
    .filter((group) => connectionTypesByGroupToRender[group.id].length)
    .filter((group) => !selectedConnectionGroup || group.id === selectedConnectionGroup)
    .map((group) => (
      <React.Fragment key={group.id}>
        {shouldRenderGroupTitles && (
          <>
            <Title headingLevel="h3">{group.label}</Title>
            <Content component="p" className="pf-v6-u-mb-sm pf-v6-u-mt-sm">
              {group.description}
            </Content>
          </>
        )}
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

  const shouldRenderEmptySearchState =
    (Boolean(normalizedSearchTerm) || hasFilters) && galleryCards.length === 0;

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
