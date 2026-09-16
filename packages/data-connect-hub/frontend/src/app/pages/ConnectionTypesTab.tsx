/* eslint-disable no-console -- Used for logging edge cases */
/* eslint-disable @typescript-eslint/no-unused-vars */

// Modules -------------------------------------------------------------------->

import React, { useState, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useConnectionTypes } from '~/app/hooks/useConnectionTypes.ts';
import emptyStateImage from '~/images/RH-API-Illustration-Gray_20-2024_07-RGB.svg';
import {
  Button,
  Card,
  CardHeader,
  CardTitle,
  CardBody,
  CardFooter,
  Checkbox,
  Dropdown,
  DropdownItem,
  DropdownList,
  EmptyState,
  EmptyStateActions,
  EmptyStateBody,
  EmptyStateVariant,
  Flex,
  FlexItem,
  Gallery,
  HelperText,
  HelperTextItem,
  Label,
  LabelGroup,
  MenuToggle,
  PageSection,
  SearchInput,
  Sidebar,
  SidebarContent,
  SidebarPanel,
  Spinner,
  Switch,
  Title,
  ToggleGroup,
  ToggleGroupItem,
  Toolbar,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  ToolbarToggleGroup,
} from '@patternfly/react-core';
import type { Identified, Labelled, Described, ConnectionType } from '~/app/types';

// Types ---------------------------------------------------------------------->

type FilterItem = Identified<string> & Labelled<string>;

type FilterItems = Record<string, FilterItem>;

type SelectedFilters = Record<string, string | null>;

type ConnectionGroup = Identified<string> & Labelled<string> & Described<string>;

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

const connectionGroups: Record<string, ConnectionGroup> = {
  all: { id: 'all', label: 'All connections', description: 'All connections' },
  rh: {
    id: 'rh',
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
  connectionGroups: false,
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

const ConnectionTypeCardIdentifier = (id: string) => `${id}--ConnectionTypeCard`;
type ConnectionTypeCardProps = { connectionType: ConnectionType };
const ConnectionTypeCard: React.FC<ConnectionTypeCardProps> = ({ connectionType }) => {
  const rootId = ConnectionTypeCardIdentifier(connectionType.metadata.id);
  const { pathname, search } = useLocation();
  const detailsPath = `${pathname.replace(/\/$/, '')}/${encodeURIComponent(
    connectionType.metadata.id,
  )}${search}`;
  return (
    <Card id={rootId} isClickable>
      <CardHeader
        selectableActions={{
          to: detailsPath,
          selectableActionAriaLabelledby: `${rootId}-card-title`,
        }}
      >
        <CardTitle id={`${rootId}-card-title`}>{connectionType.resource.name}</CardTitle>
      </CardHeader>
      <CardBody>{connectionType.resource.description}</CardBody>
      <CardFooter>Footer</CardFooter>
    </Card>
  );
};

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
  const [showOnlyInstalledToggle, setShowOnlyInstalledToggle] = React.useState<boolean>(false);
  const [selectedConnectionGroup, setSelectedConnectionGroup] = React.useState<string>(
    defaults.toolbar.groups.all.id,
  );

  const [connectionTypes, typesLoaded, typesError] = useConnectionTypes(namespace);

  // Helpers ------------------------------------------------------------------>

  const isEmpty = connectionTypes.length === 0;

  const shouldShowConnectionType = (connectionType: ConnectionType) => {
    if (typeof searchTerm === 'string' && searchTerm.length) {
      const renderedConnectionTypeValues = `${connectionType.resource.name} ${connectionType.resource.description}`;
      return renderedConnectionTypeValues.includes(searchTerm);
    }
    return true;
  };

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
    <Flex direction={{ default: 'column' }}>
      <Flex className="pf-v6-u-mb-md">
        <FlexItem>
          <SearchInput
            className="pf-v6-u-mr-sm"
            aria-label="Search data connection types by name"
            placeholder="Search by name or description..."
            value={searchTerm}
            onChange={(_event, value) => setSearchTerm(value)}
            onSearch={(_event, value) => setSearchTerm(value)}
            onClear={() => setSearchTerm('')}
          />
        </FlexItem>
        {localFeatureFlags.showOnlyInstalled && (
          <FlexItem>
            <Switch
              id="show-only-installed"
              label="Show only installed"
              isChecked={showOnlyInstalledToggle}
              onChange={(_event: React.FormEvent<HTMLInputElement>, checked: boolean) =>
                setShowOnlyInstalledToggle(checked)
              }
              ouiaId="ShowOnlyInstalledSwitch"
            />
          </FlexItem>
        )}
      </Flex>
      {localFeatureFlags.connectionGroups && (
        <Flex className="pf-v6-u-mb-md">
          <ToggleGroup aria-label="Connection groups">
            {Object.values(defaults.toolbar.groups).map((group) => (
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
        </Flex>
      )}
    </Flex>
  );

  const connectionTypesCatalog = (
    <Sidebar hasBorder hasGutter>
      {localFeatureFlags.filters && sidebarPanel}
      <SidebarContent>
        <Flex direction={{ default: 'column' }}>
          {toolbar}
          <Gallery hasGutter maxWidths={{ default: '350px' }}>
            {connectionTypes.filter(shouldShowConnectionType).map((connectionType) => (
              <ConnectionTypeCard
                key={ConnectionTypeCardIdentifier(connectionType.metadata.id)}
                connectionType={connectionType}
              />
            ))}
          </Gallery>
        </Flex>
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
      {isEmpty && emptyState}
      {!isEmpty && typesLoaded && !typesError && connectionTypesCatalog}
    </PageSection>
  );
};

// Public --------------------------------------------------------------------->

export default ConnectionTypesTab;
