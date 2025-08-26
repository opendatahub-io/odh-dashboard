import * as React from 'react';
import { SearchInput, ToolbarGroup } from '@patternfly/react-core';
import { useNavigate } from 'react-router';
import { ModelVersion, RegisteredModel } from '#~/concepts/modelRegistry/types';
import { filterRegisteredModels } from '#~/pages/modelRegistry/screens/utils';
import EmptyModelRegistryState from '#~/concepts/modelRegistry/content/EmptyModelRegistryState.tsx';
import { registerModelRoute } from '#~/routes/modelRegistry/register';
import { registeredModelArchiveRoute } from '#~/routes/modelRegistry/modelArchive';
import { ProjectObjectType, typedEmptyImage } from '#~/concepts/design/utils';
import { filterArchiveModels, filterLiveModels } from '#~/concepts/modelRegistry/utils';
import { ModelRegistriesContext } from '#~/concepts/modelRegistry/context/ModelRegistriesContext';
import {
  initialModelRegistryFilterData,
  ModelRegistryFilterDataType,
  ModelRegistryFilterOptions,
  modelRegistryFilterOptions,
} from '#~/pages/modelRegistry/screens/const';
import FilterToolbar from '#~/components/FilterToolbar';
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
  const [filterData, setFilterData] = React.useState<ModelRegistryFilterDataType>(
    initialModelRegistryFilterData,
  );
  const unfilteredRegisteredModels = filterLiveModels(registeredModels);
  const archiveRegisteredModels = filterArchiveModels(registeredModels);

  const onFilterUpdate = React.useCallback(
    (key: string, value: string | { label: string; value: string } | undefined) =>
      setFilterData((prevValues) => ({ ...prevValues, [key]: value })),
    [setFilterData],
  );

  const onClearFilters = React.useCallback(
    () => setFilterData(initialModelRegistryFilterData),
    [setFilterData],
  );

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
    filterData,
  );

  const toggleGroupItems = (
    <ToolbarGroup variant="filter-group">
      <FilterToolbar
        data-testid="model-registry-table-toolbar"
        filterOptions={modelRegistryFilterOptions}
        filterOptionRenders={{
          [ModelRegistryFilterOptions.keyword]: ({ onChange, ...props }) => (
            <SearchInput
              {...props}
              aria-label="Filter by keyword"
              placeholder="Filter by keyword"
              onChange={(_event, value) => onChange(value)}
            />
          ),
          [ModelRegistryFilterOptions.owner]: ({ onChange, ...props }) => (
            <SearchInput
              {...props}
              aria-label="Filter by owner"
              placeholder="Filter by owner"
              onChange={(_event, value) => onChange(value)}
            />
          ),
        }}
        filterData={filterData}
        onFilterUpdate={onFilterUpdate}
      />
    </ToolbarGroup>
  );

  return (
    <RegisteredModelTable
      refresh={refresh}
      clearFilters={onClearFilters}
      registeredModels={filteredRegisteredModels}
      toolbarContent={
        <RegisteredModelsTableToolbar
          toggleGroupItems={toggleGroupItems}
          onClearAllFilters={onClearFilters}
        />
      }
    />
  );
};

export default RegisteredModelListView;
