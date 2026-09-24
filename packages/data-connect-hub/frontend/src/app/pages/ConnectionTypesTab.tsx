/* eslint-disable no-console -- Used for logging edge cases */
/* eslint-disable @typescript-eslint/no-unused-vars */

// Modules -------------------------------------------------------------------->

import React, { useState } from 'react';
import { useConnectionTypes } from '~/app/hooks/useConnectionTypes.ts';
import emptyStateImage from '~/images/RH-API-Illustration-Gray_20-2024_07-RGB.svg';
import {
  Checkbox,
  Content,
  EmptyState,
  EmptyStateBody,
  Gallery,
  PageSection,
  SearchInput,
  Sidebar,
  SidebarContent,
  SidebarPanel,
  Stack,
  StackItem,
  Switch,
  Title,
  ToggleGroup,
  ToggleGroupItem,
} from '@patternfly/react-core';
import {
  KnownConnectionTypes,
  ConnectionTypeCard,
  ConnectionTypeCardIdentifier,
} from '~/app/components/ConnectionType.tsx';
import type {
  Identified,
  Labelled,
  Described,
  ConnectionType,
  ConnectionTypeGroup,
} from '~/app/types';

// Types ---------------------------------------------------------------------->

type FilterItem = Identified<string> & Labelled<string>;

type FilterItems = Record<string, FilterItem>;

type SelectedFilters = Record<string, string | null>;

type ConnectionGroup = Identified<ConnectionTypeGroup> &
  Labelled<string> &
  Described<string> & {
    renderGroupSection?: boolean;
  };

// Globals -------------------------------------------------------------------->

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
  all: {
    id: 'all',
    label: 'All connections',
    description: 'All connections',
    renderGroupSection: false,
  },
  red_hat: {
    id: 'red_hat',
    label: 'Red Hat connections',
    description: 'Official Red Hat connection types with full support.',
  },
  partner: {
    id: 'partner',
    label: 'Red Hat partner connections',
    description: 'A collection of Red Hat partner connection types.',
  },
  other: {
    id: 'other',
    label: 'Other connections',
    description: 'A broad collection of community and third-party connection types.',
  },
};

const localFeatureFlags = {
  showOnlyInstalled: false,
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

type ConnectionTypesTabProps = { namespace: string };
const ConnectionTypesTab: React.FC<ConnectionTypesTabProps> = ({ namespace }) => {
  const initialSelectedFilters = Object.keys(defaults.filter.sections).reduce<SelectedFilters>(
    (acc, cur) => {
      acc[cur] = null;
      return acc;
    },
    {},
  );

  // State -------------------------------------------------------------------->

  const [selectedFilters, setSelectedFilters] =
    React.useState<SelectedFilters>(initialSelectedFilters);
  const [searchTerm, setSearchTerm] = React.useState<string>('');
  const [showOnlyInstalledToggle, setShowOnlyInstalledToggle] = useState<boolean>(false);
  const [selectedConnectionGroup, setSelectedConnectionGroup] = useState<ConnectionTypeGroup>(
    defaults.toolbar.groups.all.id,
  );

  const [connectionTypes, typesLoaded, typesError] = useConnectionTypes(namespace);

  // Helpers ------------------------------------------------------------------>

  const isEmpty = connectionTypes.length === 0;

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
      all: [...connectionTypes],
      red_hat: [],
      partner: [],
      other: [],
    };

    connectionTypes.forEach((connectionType) => {
      const knownConnection = KnownConnectionTypes[connectionType.resource.provider];
      const group = knownConnection?.group ?? 'other';
      groupedConnectionTypes[group].push(connectionType);
    });

    return groupedConnectionTypes;
  }, [connectionTypes]);

  const connectionTypesByGroupToRender = React.useMemo<
    Record<ConnectionTypeGroup, ConnectionType[]>
  >(() => {
    const filteredConnectionTypes: Record<ConnectionTypeGroup, ConnectionType[]> = {
      all: [],
      red_hat: [],
      partner: [],
      other: [],
    };
    Object.values(connectionGroups).forEach(({ id: connectionTypeGroup }) => {
      filteredConnectionTypes[connectionTypeGroup] =
        connectionTypesByGroup[connectionTypeGroup].filter(shouldShowConnectionType);
    });
    return filteredConnectionTypes;
  }, [connectionTypesByGroup, shouldShowConnectionType]);

  const shouldRenderEmptySearchState = Object.values(connectionTypesByGroupToRender).every(
    (renderedConnectionTypes) => renderedConnectionTypes.length === 0,
  );

  // Rendering ---------------------------------------------------------------->

  const emptyState = (
    <EmptyState
      headingLevel="h3"
      icon={() => <img src={emptyStateImage} alt="" width={108} height={108} />}
      titleText="Get started with data connection types"
    >
      <EmptyStateBody>
        Browse available data connection types and use them to create new data connections
      </EmptyStateBody>
    </EmptyState>
  );

  const emptySearchState = (
    <EmptyState
      headingLevel="h3"
      icon={() => <img src={emptyStateImage} alt="" width={108} height={108} />}
      titleText="No matching data connection types"
    >
      <EmptyStateBody>No data connection types match your search or filter</EmptyStateBody>
    </EmptyState>
  );

  const sidebarPanel = (
    <SidebarPanel>
      {Object.values(defaults.filter.sections).map((section, sectionIndex, sectionsList) => (
        <React.Fragment key={`ConnectionTypesTab-sidebar-filter-section--${section.id}`}>
          <Title className="pf-v6-u-mb-sm" headingLevel="h4">
            {section.label}
          </Title>
          {Object.values(section.items).map((sectionItem) => (
            <Checkbox
              key={`ConnectionTypesTab-sidebar-filter-checkbox--${section.id}::${sectionItem.id}`}
              id={`ConnectionTypesTab-sidebar-filter-checkbox--${section.id}::${sectionItem.id}`}
              name={sectionItem.id}
              label={sectionItem.label}
              isChecked={selectedFilters[section.id] === sectionItem.id}
              onChange={(evt, checked) => {
                const filterItemId = evt.currentTarget.name;

                setSelectedFilters((previousSelectedFilters) => ({
                  ...previousSelectedFilters,
                  [sectionItem.id]: checked ? filterItemId : null,
                }));
              }}
            />
          ))}
          {sectionIndex !== sectionsList.length - 1 && (
            <div
              style={{
                borderBottom:
                  'var(--pf-t--global--border--width--divider--default) solid var(--pf-t--global--border--color--default)',
                paddingBottom: 'var(--pf-t--global--spacer--md)',
                marginBottom: 'var(--pf-t--global--spacer--md)',
              }}
            />
          )}
        </React.Fragment>
      ))}
    </SidebarPanel>
  );

  const toolbar = (
    <Stack>
      <StackItem className="pf-v6-u-mb-md">
        <SearchInput
          name="ConnectionTypesTab-toolbar-search"
          aria-label="Search data connection types by name"
          placeholder="Search by name or description..."
          value={searchTerm}
          onChange={(_event, value) => setSearchTerm(value)}
          onSearch={(_event, value) => setSearchTerm(value)}
          onClear={() => setSearchTerm('')}
        />
        {localFeatureFlags.showOnlyInstalled && (
          <Switch
            className="pf-v6-u-ml-sm"
            id="ConnectionTypesTab-show-only-installed"
            label="Show only installed"
            isChecked={showOnlyInstalledToggle}
            onChange={(_event: React.FormEvent<HTMLInputElement>, checked: boolean) =>
              setShowOnlyInstalledToggle(checked)
            }
            ouiaId="ShowOnlyInstalledSwitch"
          />
        )}
      </StackItem>
      <StackItem className="pf-v6-u-mb-md">
        <ToggleGroup aria-label="Connection groups">
          {Object.values(defaults.toolbar.groups)
            .filter((group) => connectionTypesByGroup[group.id].length)
            .map((group) => (
              <ToggleGroupItem
                key={`ConnectionTypesTab-toolbar-group-item--${group.id}`}
                buttonId={`ConnectionTypesTab-toolbar-group-item--${group.id}`}
                text={group.label}
                isSelected={selectedConnectionGroup === group.id}
                onChange={(event, isSelected: boolean) => {
                  if (!isSelected) {
                    setSelectedConnectionGroup(defaults.toolbar.groups.all.id);
                  } else {
                    setSelectedConnectionGroup(group.id);
                  }
                }}
              />
            ))}
        </ToggleGroup>
      </StackItem>
    </Stack>
  );

  const catalog = (
    <Sidebar hasBorder hasGutter>
      {localFeatureFlags.filters && sidebarPanel}
      <SidebarContent>
        <Stack>
          {toolbar}
          {Object.values(defaults.toolbar.groups)
            .filter((group) => group.renderGroupSection !== false)
            .filter((group) => connectionTypesByGroupToRender[group.id].length)
            .filter((group) => {
              if (selectedConnectionGroup !== 'all') {
                return group.id === selectedConnectionGroup;
              }
              return true;
            })
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
                    />
                  ))}
                </Gallery>
              </React.Fragment>
            ))}
        </Stack>
      </SidebarContent>
    </Sidebar>
  );

  return (
    <PageSection isFilled hasBodyWrapper={false}>
      <p className="pf-v6-u-mb-md">
        Discover and configure pre-defined data connections available to your organization. Browse
        available catalogs to easily connect your projects to external storage, databases, and
        services.
      </p>
      {!isEmpty && typesLoaded && !typesError && catalog}
      {!isEmpty && searchTerm && shouldRenderEmptySearchState && emptySearchState}
      {isEmpty && emptyState}
    </PageSection>
  );
};

// Public --------------------------------------------------------------------->

export default ConnectionTypesTab;
