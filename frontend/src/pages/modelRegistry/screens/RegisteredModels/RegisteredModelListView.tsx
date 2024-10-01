import * as React from 'react';
import { SearchInput, ToolbarFilter, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import { FilterIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router';
import { SearchType } from '~/concepts/dashboard/DashboardSearchField';
import { RegisteredModel } from '~/concepts/modelRegistry/types';
import SimpleSelect from '~/components/SimpleSelect';
import { filterRegisteredModels } from '~/pages/modelRegistry/screens/utils';
import { ModelRegistrySelectorContext } from '~/concepts/modelRegistry/context/ModelRegistrySelectorContext';
import EmptyModelRegistryState from '~/pages/modelRegistry/screens/components/EmptyModelRegistryState';
import {
  registerModelUrl,
  registeredModelArchiveUrl,
} from '~/pages/modelRegistry/screens/routeUtils';
import { asEnumMember } from '~/utilities/utils';
import { ProjectObjectType, typedEmptyImage } from '~/concepts/design/utils';
import { filterArchiveModels, filterLiveModels } from '~/concepts/modelRegistry/utils';
import RegisteredModelTable from './RegisteredModelTable';
import RegisteredModelsTableToolbar from './RegisteredModelsTableToolbar';

type RegisteredModelListViewProps = {
  registeredModels: RegisteredModel[];
  refresh: () => void;
};

const RegisteredModelListView: React.FC<RegisteredModelListViewProps> = ({
  registeredModels,
  refresh,
}) => {
  const navigate = useNavigate();
  const { preferredModelRegistry } = React.useContext(ModelRegistrySelectorContext);
  const [searchType, setSearchType] = React.useState<SearchType>(SearchType.KEYWORD);
  const [search, setSearch] = React.useState('');
  const unfilteredRegisteredModels = filterLiveModels(registeredModels);
  const archiveRegisteredModels = filterArchiveModels(registeredModels);
  const searchTypes = React.useMemo(() => [SearchType.KEYWORD, SearchType.OWNER], []);

  if (unfilteredRegisteredModels.length === 0) {
    return (
      <EmptyModelRegistryState
        testid="empty-registered-models"
        title="No models in selected registry"
        headerIcon={() => (
          <img
            src={typedEmptyImage(ProjectObjectType.registeredModels, 'MissingModel')}
            alt="missing model"
          />
        )}
        description={`${preferredModelRegistry?.metadata.name} has no active registered models. Register a model in this registry, or select a different registry.`}
        primaryActionText="Register model"
        secondaryActionText={
          archiveRegisteredModels.length !== 0 ? 'View archived models' : undefined
        }
        primaryActionOnClick={() => {
          navigate(registerModelUrl(preferredModelRegistry?.metadata.name));
        }}
        secondaryActionOnClick={() => {
          navigate(registeredModelArchiveUrl(preferredModelRegistry?.metadata.name));
        }}
      />
    );
  }

  const filteredRegisteredModels = filterRegisteredModels(
    unfilteredRegisteredModels,
    search,
    searchType,
  );

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
          data-testid="registered-model-table-search"
        />
      </ToolbarItem>
    </ToolbarGroup>
  );

  return (
    <RegisteredModelTable
      refresh={refresh}
      clearFilters={resetFilters}
      registeredModels={filteredRegisteredModels}
      toolbarContent={<RegisteredModelsTableToolbar toggleGroupItems={toggleGroupItems} />}
    />
  );
};

export default RegisteredModelListView;
