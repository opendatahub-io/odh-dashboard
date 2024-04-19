import * as React from 'react';
import { SearchInput, ToolbarFilter, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import { FilterIcon } from '@patternfly/react-icons';
import { SearchType } from '~/concepts/dashboard/DashboardSearchField';
import { RegisteredModel } from '~/concepts/modelRegistry/types';
import SimpleDropdownSelect from '~/components/SimpleDropdownSelect';
import RegisteredModelTable from './RegisteredModelTable';
import RegisteredModelsTableToolbar from './RegisteredModelsTableToolbar';

type RegisteredModelListViewProps = {
  registeredModels: RegisteredModel[];
};

const RegisteredModelListView: React.FC<RegisteredModelListViewProps> = ({
  registeredModels: unfilteredRegisteredModels,
}) => {
  const [searchType, setSearchType] = React.useState<SearchType>(SearchType.KEYWORD);
  const [search, setSearch] = React.useState('');

  const searchTypes = React.useMemo(() => [SearchType.KEYWORD], []); // TODO Add owner once RHOAIENG-5066 is completed.

  const filteredRegisteredModels = unfilteredRegisteredModels.filter((rm) => {
    if (!search) {
      return true;
    }

    switch (searchType) {
      case SearchType.KEYWORD:
        return (
          rm.name.toLowerCase().includes(search.toLowerCase()) ||
          (rm.description && rm.description.toLowerCase().includes(search.toLowerCase()))
        );

      case SearchType.OWNER:
        // TODO Implement owner search functionality once RHOAIENG-5066 is completed.
        return;

      default:
        return true;
    }
  });

  const resetFilters = () => {
    setSearch('');
  };

  const toggleGroupItems = (
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
        />
      </ToolbarItem>
    </ToolbarGroup>
  );

  return (
    <RegisteredModelTable
      clearFilters={resetFilters}
      registeredModels={filteredRegisteredModels}
      toolbarContent={<RegisteredModelsTableToolbar toggleGroupItems={toggleGroupItems} />}
    />
  );
};

export default RegisteredModelListView;
