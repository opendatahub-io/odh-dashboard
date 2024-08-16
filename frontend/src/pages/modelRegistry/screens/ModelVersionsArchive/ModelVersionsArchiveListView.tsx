import * as React from 'react';
import {
  SearchInput,
  ToolbarContent,
  ToolbarFilter,
  ToolbarGroup,
  ToolbarItem,
  ToolbarToggleGroup,
} from '@patternfly/react-core';
import { FilterIcon } from '@patternfly/react-icons';
import { SearchType } from '~/concepts/dashboard/DashboardSearchField';
import { ModelVersion } from '~/concepts/modelRegistry/types';
import SimpleSelect from '~/components/SimpleSelect';
import { filterModelVersions } from '~/pages/modelRegistry/screens/utils';
import EmptyModelRegistryState from '~/pages/modelRegistry/screens/components/EmptyModelRegistryState';
import { asEnumMember } from '~/utilities/utils';
import ModelVersionsArchiveTable from './ModelVersionsArchiveTable';

type ModelVersionsArchiveListViewProps = {
  modelVersions: ModelVersion[];
  refresh: () => void;
};

const ModelVersionsArchiveListView: React.FC<ModelVersionsArchiveListViewProps> = ({
  modelVersions: unfilteredmodelVersions,
  refresh,
}) => {
  const [searchType, setSearchType] = React.useState<SearchType>(SearchType.KEYWORD);
  const [search, setSearch] = React.useState('');

  const searchTypes = [SearchType.KEYWORD, SearchType.AUTHOR];

  const filteredModelVersions = filterModelVersions(unfilteredmodelVersions, search, searchType);

  if (unfilteredmodelVersions.length === 0) {
    return (
      <EmptyModelRegistryState
        testid="empty-archive-state"
        title="No archived versions"
        description="You can archive the active versions that you no longer use. You can restore an archived versions to make it active."
      />
    );
  }

  return (
    <ModelVersionsArchiveTable
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
                categoryName="Keyword"
              >
                <SimpleSelect
                  options={searchTypes.map((key) => ({
                    key,
                    label: key,
                  }))}
                  value={searchType}
                  onChange={(newSearchType) => {
                    const enumMember = asEnumMember(newSearchType, SearchType);
                    if (enumMember) {
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
                  data-testid="model-versions-archive-table-search"
                />
              </ToolbarItem>
            </ToolbarGroup>
          </ToolbarToggleGroup>
        </ToolbarContent>
      }
    />
  );
};

export default ModelVersionsArchiveListView;
