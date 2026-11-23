// Modules -------------------------------------------------------------------->

import React from 'react';
import {
  EmptyState,
  EmptyStateBody,
  Gallery,
  SearchInput,
  Stack,
  StackItem,
  ToolbarItem,
} from '@patternfly/react-core';
import {
  ToolbarFilter,
  type FilterState,
  type FilterValue,
  type MultiselectFilterConfig,
  type SelectFilterConfig,
} from 'mod-arch-shared';

import {
  type ConnectionTypeCapability,
  ConnectionTypeCapabilities,
  ConnectionTypeInstance,
  ConnectionTypeCard,
  ConnectionTypeCardIdentifier,
} from '~/app/components/ConnectionType';
import type { Valued, Labelled, ConnectionType } from '~/app/types';
import { IdentifiedLabelledToValuedLabelled } from '~/app/types';

import emptyStateImage from '~/images/RHOAI-Noconnections-RGB.svg';

import './ConnectionTypesGallery.scss';

// Types ---------------------------------------------------------------------->

type FilterOption = 'capability' | 'labels';

type ConnectionTypesFilterConfig = {
  capability: SelectFilterConfig;
  labels: MultiselectFilterConfig;
};

type RenderedLabel = Valued<string> & Labelled<string>;

// Globals -------------------------------------------------------------------->

const capabilityFilters = {
  ...IdentifiedLabelledToValuedLabelled(ConnectionTypeCapabilities.full_integration),
  ...IdentifiedLabelledToValuedLabelled(ConnectionTypeCapabilities.credentials),
};

const filterConfig: ConnectionTypesFilterConfig = {
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
    options: [],
  },
};

const initialFilterValues: FilterState<FilterOption> = {
  capability: '',
  labels: [],
};

const defaults = {
  toolbar: {
    groups: ConnectionTypeCapabilities,
  },
};

// Components ----------------------------------------------------------------->

type ConnectionTypesGalleryProps = {
  connectionTypes: ConnectionTypeInstance[];
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
      if (filterValues.labels.length) {
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

    connectionTypes.forEach((connectionType) => {
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

  const connectionTypeLabels = React.useMemo<RenderedLabel[]>(() => {
    const labelsSet = Object.values(connectionTypesByGroup)
      .flat()
      .reduce((set, connectionType) => {
        if (connectionType.resource.tags) {
          connectionType.resource.tags.forEach((label) => set.add(label));
        }
        return set;
      }, new Set<string>());

    return Array.from(labelsSet)
      .sort()
      .map((label) => ({
        value: label,
        label: label,
      }));
  }, [connectionTypesByGroup]);

  const hasFilters = Boolean(filterValues.capability) || Boolean(filterValues.labels.length);

  const dynamicFilterConfig = React.useMemo(
    () => ({
      ...filterConfig,
      labels: {
        ...filterConfig.labels,
        options: connectionTypeLabels,
      },
    }),
    [connectionTypeLabels],
  );

  const dynamicVisibleFilterKeys = React.useMemo<FilterOption[]>(() => {
    if (!connectionTypeLabels.length) {
      return ['capability'];
    }
    return ['capability', 'labels'];
  }, [connectionTypeLabels]);

  // Rendering ---------------------------------------------------------------->

  const toolbar = (
    <ToolbarFilter
      filterConfig={dynamicFilterConfig}
      visibleFilterKeys={dynamicVisibleFilterKeys}
      filterValues={filterValues}
      onFilterChange={onFilterChange}
      onClearAllFilters={onClearAllFilters}
      testIdPrefix="connection-types-gallery"
      toolbarActions={
        <ToolbarItem className="dch-connection-types-search">
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
    .map((group) => connectionTypesByGroupToRender[group.id])
    .flat()
    .map((connectionType) => (
      <ConnectionTypeCard
        key={ConnectionTypeCardIdentifier(connectionType.metadata.id)}
        connectionType={connectionType}
        isSelectable={isSelectable}
        isSelected={connectionType.metadata.id === selectedConnectionTypeId}
        onClick={() => onConnectionTypeClick(connectionType)}
      />
    ));

  const shouldRenderEmptyState = connectionTypes.length === 0;

  const emptyState = (
    <EmptyState
      headingLevel="h3"
      icon={() => <img src={emptyStateImage} alt="" width={320} height={320} />}
      titleText="No data connection types"
    >
      <EmptyStateBody>No data connection types available</EmptyStateBody>
    </EmptyState>
  );

  const shouldRenderEmptySearchState =
    !shouldRenderEmptyState &&
    (Boolean(normalizedSearchTerm) || hasFilters) &&
    galleryCards.length === 0;

  const emptySearchState = (
    <EmptyState
      headingLevel="h3"
      icon={() => <img src={emptyStateImage} alt="" width={320} height={320} />}
      titleText="No matching data connection types"
    >
      <EmptyStateBody>No data connection types match your search or filter</EmptyStateBody>
    </EmptyState>
  );

  return (
    <Stack>
      <StackItem>{toolbar}</StackItem>
      <StackItem>
        <Gallery hasGutter maxWidths={{ default: '350px' }} className="pf-v6-u-mb-lg">
          {galleryCards}
        </Gallery>
      </StackItem>
      {shouldRenderEmptyState && <StackItem>{emptyState}</StackItem>}
      {shouldRenderEmptySearchState && <StackItem>{emptySearchState}</StackItem>}
    </Stack>
  );
};

// Public --------------------------------------------------------------------->

export default ConnectionTypesGallery;
