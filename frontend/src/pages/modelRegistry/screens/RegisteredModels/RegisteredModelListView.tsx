import * as React from 'react';
import { SearchInput, ToolbarFilter, ToolbarGroup, ToolbarItem } from '@patternfly/react-core';
import { FilterIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router';
import { SearchType } from '#~/concepts/dashboard/DashboardSearchField';
import { ModelVersion, RegisteredModel } from '#~/concepts/modelRegistry/types';
import SimpleSelect, { SimpleSelectOption } from '#~/components/SimpleSelect';
import { filterRegisteredModels } from '#~/pages/modelRegistry/screens/utils';
import EmptyModelRegistryState from '#~/concepts/modelRegistry/content/EmptyModelRegistryState.tsx';
import { registerModelRoute } from '#~/routes/modelRegistry/register';
import { registeredModelArchiveRoute } from '#~/routes/modelRegistry/modelArchive';
import { asEnumMember } from '#~/utilities/utils';
import { ProjectObjectType, typedEmptyImage } from '#~/concepts/design/utils';
import { filterArchiveModels, filterLiveModels } from '#~/concepts/modelRegistry/utils';
import { ModelRegistriesContext } from '#~/concepts/modelRegistry/context/ModelRegistriesContext';
import RegisteredModelTable from './RegisteredModelTable';
import RegisteredModelsTableToolbar from './RegisteredModelsTableToolbar';

type RegisteredModelListViewProps = {
  registeredModels: RegisteredModel[];
  modelVersions: ModelVersion[];
  refresh: () => void;
};

const RegisteredModelListView: React.FC<RegisteredModelListViewProps> = ({
  registeredModels,
  modelVersions,
  refresh,
}) => {
  const navigate = useNavigate();
  const { preferredModelRegistry } = React.useContext(ModelRegistriesContext);
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
        description={`${
          preferredModelRegistry?.metadata.name ?? ''
        } has no active registered models. Register a model in this registry, or select a different registry.`}
        primaryActionText="Register model"
        secondaryActionText={
          archiveRegisteredModels.length !== 0 ? 'View archived models' : undefined
        }
        primaryActionOnClick={() => {
          navigate(registerModelRoute(preferredModelRegistry?.metadata.name));
        }}
        secondaryActionOnClick={() => {
          navigate(registeredModelArchiveRoute(preferredModelRegistry?.metadata.name));
        }}
      />
    );
  }

  const filteredRegisteredModels = filterRegisteredModels(
    unfilteredRegisteredModels,
    modelVersions,
    search,
    searchType,
  );

  const resetFilters = () => {
    setSearch('');
  };

  const toggleGroupItems = (
    <ToolbarGroup variant="filter-group">
      <ToolbarFilter
        labels={search === '' ? [] : [search]}
        deleteLabel={resetFilters}
        deleteLabelGroup={resetFilters}
        categoryName="Keyword"
      >
        <SimpleSelect
          options={searchTypes.map(
            (key): SimpleSelectOption => ({
              key,
              label: key,
            }),
          )}
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
      <ToolbarItem>
        <SearchInput
          placeholder={`Find by ${searchType.toLowerCase()}`}
          value={search}
          onChange={(_, searchValue) => {
            setSearch(searchValue);
          }}
          onClear={resetFilters}
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
      toolbarContent={
        <RegisteredModelsTableToolbar
          toggleGroupItems={toggleGroupItems}
          onClearAllFilters={resetFilters}
        />
      }
    />
  );
};

export default RegisteredModelListView;
