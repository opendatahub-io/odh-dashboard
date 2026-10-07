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
  Switch,
  Title,
  ToggleGroup,
  ToggleGroupItem,
} from '@patternfly/react-core';
import emptyStateImage from '~/images/RHOAI-Noconnections-RGB.svg';
import {
  KnownConnectionTypes,
  ConnectionTypeCard,
  ConnectionTypeCardIdentifier,
} from '~/app/components/ConnectionType';
import type {
  Identified,
  Labelled,
  Described,
  ConnectionType,
  ConnectionTypeGroup,
} from '~/app/types';

type FilterItem = Identified<string> & Labelled<string>;

type FilterItems = Record<string, FilterItem>;

type SelectedFilters = Record<string, string | null>;

type ConnectionGroup = Identified<ConnectionTypeGroup> &
  Labelled<string> &
  Described<string> & {
    renderGroupSection?: boolean;
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
  const [showOnlyInstalledToggle, setShowOnlyInstalledToggle] = React.useState(false);
  const [selectedConnectionGroup, setSelectedConnectionGroup] = React.useState<ConnectionTypeGroup>(
    defaults.toolbar.groups.all.id,
  );

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

  const shouldRenderEmptySearchState =
    Boolean(searchTerm) &&
    Object.values(connectionTypesByGroupToRender).every(
      (renderedConnectionTypes) => renderedConnectionTypes.length === 0,
    );

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
            <Stack>
              <StackItem className="pf-v6-u-mb-md">
                <SearchInput
                  name="ConnectionTypesGallery-toolbar-search"
                  aria-label="Search data connection types by name"
                  placeholder="Search by name or description..."
                  value={searchTerm}
                  onChange={(_event, value) => setSearchTerm(value)}
                  onSearch={(_event, value) => setSearchTerm(value)}
                  onClear={() => setSearchTerm('')}
                />
                {localFeatureFlags.showOnlyInstalled ? (
                  <Switch
                    className="pf-v6-u-ml-sm"
                    id="ConnectionTypesGallery-show-only-installed"
                    label="Show only installed"
                    isChecked={showOnlyInstalledToggle}
                    onChange={(_event: React.FormEvent<HTMLInputElement>, checked: boolean) =>
                      setShowOnlyInstalledToggle(checked)
                    }
                    ouiaId="ShowOnlyInstalledSwitch"
                  />
                ) : null}
              </StackItem>
              <StackItem className="pf-v6-u-mb-md">
                <ToggleGroup aria-label="Connection groups">
                  {Object.values(defaults.toolbar.groups)
                    .filter((group) => connectionTypesByGroup[group.id].length)
                    .map((group) => (
                      <ToggleGroupItem
                        key={`ConnectionTypesGallery-toolbar-group-item--${group.id}`}
                        buttonId={`ConnectionTypesGallery-toolbar-group-item--${group.id}`}
                        text={group.label}
                        isSelected={selectedConnectionGroup === group.id}
                        onChange={(_event, isSelected: boolean) => {
                          setSelectedConnectionGroup(
                            isSelected ? group.id : defaults.toolbar.groups.all.id,
                          );
                        }}
                      />
                    ))}
                </ToggleGroup>
              </StackItem>
            </Stack>
            {Object.values(defaults.toolbar.groups)
              .filter((group) => group.renderGroupSection !== false)
              .filter((group) => connectionTypesByGroupToRender[group.id].length)
              .filter(
                (group) =>
                  selectedConnectionGroup === 'all' || group.id === selectedConnectionGroup,
              )
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
      {shouldRenderEmptySearchState ? (
        <EmptyState
          headingLevel="h3"
          icon={() => <img src={emptyStateImage} alt="" width={108} height={108} />}
          titleText="No matching data connection types"
        >
          <EmptyStateBody>No data connection types match your search or filter</EmptyStateBody>
        </EmptyState>
      ) : null}
    </>
  );
};

export default ConnectionTypesGallery;
