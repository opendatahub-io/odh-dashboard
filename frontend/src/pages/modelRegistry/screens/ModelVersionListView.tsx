import * as React from 'react';
import {
  Button,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
  SearchInput,
  ToolbarContent,
  ToolbarFilter,
  ToolbarGroup,
  ToolbarItem,
  ToolbarToggleGroup,
} from '@patternfly/react-core';
import { EllipsisVIcon, FilterIcon } from '@patternfly/react-icons';
import { SearchType } from '~/concepts/dashboard/DashboardSearchField';
import { ModelVersion } from '~/concepts/modelRegistry/types';
import SimpleDropdownSelect from '~/components/SimpleDropdownSelect';
import ModelVersionsTable from './ModelVersionsTable';
import EmptyModelRegistryState from './EmptyModelRegistryState';
import { filteredmodelVersions } from './utils';

type ModelVersionListViewProps = {
  modelVersions: ModelVersion[];
  registeredModelName?: string;
};

const ModelVersionListView: React.FC<ModelVersionListViewProps> = ({
  modelVersions: unfilteredmodelVersions,
  registeredModelName: rmName,
}) => {
  const [searchType, setSearchType] = React.useState<SearchType>(SearchType.KEYWORD);
  const [search, setSearch] = React.useState('');

  const searchTypes = [SearchType.KEYWORD, SearchType.OWNER];

  const [isArchivedModelVersionKebabOpen, setIsArchivedModelVersionKebabOpen] =
    React.useState(false);

  const filteredModelVersions = filteredmodelVersions(unfilteredmodelVersions, search, searchType);

  if (unfilteredmodelVersions.length === 0) {
    return (
      <EmptyModelRegistryState
        title="No versions"
        description={`${rmName} has no versions registered to it. Register a version to this model.`}
        primaryActionText="Register new version"
        secondaryActionText="View archived versions"
        primaryActionOnClick={() => {
          // TODO: Add primary action
        }}
        secondaryActionOnClick={() => {
          // TODO: Add secondary action
        }}
      />
    );
  }

  return (
    <ModelVersionsTable
      clearFilters={() => setSearch('')}
      modelVersions={filteredModelVersions}
      toolbarContent={
        <ToolbarContent>
          <ToolbarToggleGroup toggleIcon={<FilterIcon />} breakpoint="xl">
            <ToolbarGroup variant="filter-group">
              <ToolbarFilter
                chips={search === '' ? [] : [search]}
                deleteChip={() => setSearch('')}
                deleteChipGroup={() => setSearch('')}
                categoryName="Keyword"
              >
                <SimpleDropdownSelect
                  options={searchTypes.map((key) => ({
                    key,
                    label: key,
                  }))}
                  value={searchType}
                  onChange={(newSearchType) => {
                    setSearchType(newSearchType as SearchType);
                  }}
                  icon={<FilterIcon />}
                />
              </ToolbarFilter>
              <ToolbarItem variant="search-filter">
                <SearchInput
                  placeholder={`Find by ${searchType.toLowerCase()}`}
                  value={search}
                  onChange={(_, searchValue) => {
                    setSearch(searchValue);
                  }}
                  onClear={() => setSearch('')}
                  style={{ minWidth: '200px' }}
                  data-testid="model-versions-table-search"
                />
              </ToolbarItem>
            </ToolbarGroup>
          </ToolbarToggleGroup>
          <ToolbarItem>
            <Button variant="secondary">Register new version</Button>
          </ToolbarItem>
          <ToolbarItem>
            <Dropdown
              isOpen={isArchivedModelVersionKebabOpen}
              onSelect={() => setIsArchivedModelVersionKebabOpen(false)}
              onOpenChange={(isOpen: boolean) => setIsArchivedModelVersionKebabOpen(isOpen)}
              toggle={(tr: React.Ref<MenuToggleElement>) => (
                <MenuToggle
                  ref={tr}
                  variant="plain"
                  onClick={() =>
                    setIsArchivedModelVersionKebabOpen(!isArchivedModelVersionKebabOpen)
                  }
                  isExpanded={isArchivedModelVersionKebabOpen}
                  aria-label="View archived models"
                >
                  <EllipsisVIcon />
                </MenuToggle>
              )}
              shouldFocusToggleOnSelect
            >
              <DropdownList>
                <DropdownItem isDisabled>View archived versions</DropdownItem>
              </DropdownList>
            </Dropdown>
          </ToolbarItem>
        </ToolbarContent>
      }
    />
  );
};

export default ModelVersionListView;
