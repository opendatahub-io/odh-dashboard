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
import { RegisteredModel } from '~/concepts/modelRegistry/types';
import SimpleSelect from '~/components/SimpleSelect';
import { filterRegisteredModels } from '~/pages/modelRegistry/screens/utils';
import EmptyModelRegistryState from '~/pages/modelRegistry/screens/components/EmptyModelRegistryState';
import { asEnumMember } from '~/utilities/utils';
import RegisteredModelsArchiveTable from './RegisteredModelsArchiveTable';

type RegisteredModelsArchiveListViewProps = {
  registeredModels: RegisteredModel[];
  refresh: () => void;
};

const RegisteredModelsArchiveListView: React.FC<RegisteredModelsArchiveListViewProps> = ({
  registeredModels: unfilteredRegisteredModels,
  refresh,
}) => {
  const [searchType, setSearchType] = React.useState<SearchType>(SearchType.KEYWORD);
  const [search, setSearch] = React.useState('');

  const searchTypes = [SearchType.KEYWORD, SearchType.AUTHOR];

  const filteredRegisteredModels = filterRegisteredModels(
    unfilteredRegisteredModels,
    search,
    searchType,
  );

  if (unfilteredRegisteredModels.length === 0) {
    return (
      <EmptyModelRegistryState
        testid="empty-archive-model-state"
        title="No archived models"
        description="You can archive the active models that you no longer use. You can restore an archived
      model to make it active."
      />
    );
  }

  return (
    <RegisteredModelsArchiveTable
      refresh={refresh}
      clearFilters={() => setSearch('')}
      registeredModels={filteredRegisteredModels}
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
                    const newSearchTypeInput = asEnumMember(newSearchType, SearchType);
                    if (newSearchTypeInput !== null) {
                      setSearchType(newSearchTypeInput);
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
                  data-testid="registered-models-archive-table-search"
                />
              </ToolbarItem>
            </ToolbarGroup>
          </ToolbarToggleGroup>
        </ToolbarContent>
      }
    />
  );
};

export default RegisteredModelsArchiveListView;
