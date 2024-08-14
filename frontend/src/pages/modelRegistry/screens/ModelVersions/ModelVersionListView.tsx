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
import { useNavigate } from 'react-router';
import { SearchType } from '~/concepts/dashboard/DashboardSearchField';
import { ModelVersion, RegisteredModel } from '~/concepts/modelRegistry/types';
import SimpleSelect from '~/components/SimpleSelect';
import EmptyModelRegistryState from '~/pages/modelRegistry/screens/components/EmptyModelRegistryState';
import { filterModelVersions } from '~/pages/modelRegistry/screens/utils';
import { ModelRegistrySelectorContext } from '~/concepts/modelRegistry/context/ModelRegistrySelectorContext';
import { modelVersionArchiveUrl } from '~/pages/modelRegistry/screens/routeUtils';
import { asEnumMember } from '~/utilities/utils';
import ModelVersionsTable from './ModelVersionsTable';

type ModelVersionListViewProps = {
  modelVersions: ModelVersion[];
  registeredModel?: RegisteredModel;
  refresh: () => void;
};

const ModelVersionListView: React.FC<ModelVersionListViewProps> = ({
  modelVersions: unfilteredModelVersions,
  registeredModel: rm,
  refresh,
}) => {
  const navigate = useNavigate();
  const { preferredModelRegistry } = React.useContext(ModelRegistrySelectorContext);

  const [searchType, setSearchType] = React.useState<SearchType>(SearchType.KEYWORD);
  const [search, setSearch] = React.useState('');

  const searchTypes = [SearchType.KEYWORD, SearchType.OWNER];

  const [isArchivedModelVersionKebabOpen, setIsArchivedModelVersionKebabOpen] =
    React.useState(false);

  const filteredModelVersions = filterModelVersions(unfilteredModelVersions, search, searchType);

  if (unfilteredModelVersions.length === 0) {
    return (
      <EmptyModelRegistryState
        testid="empty-model-versions"
        title="No versions"
        description={`${rm?.name} has no versions registered to it. Register a version to this model.`}
        primaryActionText="Register new version"
        secondaryActionText="View archived versions"
        primaryActionOnClick={() => {
          // TODO: Add primary action
        }}
        secondaryActionOnClick={() => {
          navigate(modelVersionArchiveUrl(rm?.id, preferredModelRegistry?.metadata.name));
        }}
      />
    );
  }

  return (
    <ModelVersionsTable
      refresh={refresh}
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
                categoryName={searchType}
              >
                <SimpleSelect
                  dataTestId="model-versions-table-filter"
                  options={searchTypes.map((key) => ({
                    key,
                    label: key,
                  }))}
                  value={searchType}
                  onChange={(newSearchType) => {
                    const enumMember = asEnumMember(newSearchType, SearchType);
                    if (enumMember !== null) {
                      setSearchType(enumMember);
                    }
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
                  data-testid="model-versions-table-kebab-action"
                  ref={tr}
                  variant="plain"
                  onClick={() =>
                    setIsArchivedModelVersionKebabOpen(!isArchivedModelVersionKebabOpen)
                  }
                  isExpanded={isArchivedModelVersionKebabOpen}
                  aria-label="View archived versions"
                >
                  <EllipsisVIcon />
                </MenuToggle>
              )}
              shouldFocusToggleOnSelect
            >
              <DropdownList>
                <DropdownItem
                  onClick={() =>
                    navigate(modelVersionArchiveUrl(rm?.id, preferredModelRegistry?.metadata.name))
                  }
                >
                  View archived versions
                </DropdownItem>
              </DropdownList>
            </Dropdown>
          </ToolbarItem>
        </ToolbarContent>
      }
    />
  );
};

export default ModelVersionListView;
