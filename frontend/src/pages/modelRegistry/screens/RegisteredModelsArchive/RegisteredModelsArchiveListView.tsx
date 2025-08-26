import * as React from 'react';
import {
  SearchInput,
  ToolbarContent,
  ToolbarGroup,
  ToolbarToggleGroup,
} from '@patternfly/react-core';
import { FilterIcon, SearchIcon } from '@patternfly/react-icons';
import { ModelVersion, RegisteredModel } from '#~/concepts/modelRegistry/types';
import { filterRegisteredModels } from '#~/pages/modelRegistry/screens/utils';
import FilterToolbar from '#~/components/FilterToolbar';
import {
  initialModelRegistryFilterData,
  ModelRegistryFilterDataType,
  modelRegistryFilterOptions,
  ModelRegistryFilterOptions,
} from '#~/pages/modelRegistry/screens/const';
import EmptyModelRegistryState from '#~/concepts/modelRegistry/content/EmptyModelRegistryState.tsx';
import { asEnumMember } from '#~/utilities/utils';
import RegisteredModelsArchiveTable from './RegisteredModelsArchiveTable';

type RegisteredModelsArchiveListViewProps = {
  registeredModels: RegisteredModel[];
  modelVersions: ModelVersion[];
  refresh: () => void;
};

const RegisteredModelsArchiveListView: React.FC<RegisteredModelsArchiveListViewProps> = ({
  registeredModels: unfilteredRegisteredModels,
  modelVersions,
  refresh,
}) => {
  const [filterData, setFilterData] = React.useState<ModelRegistryFilterDataType>(
    initialModelRegistryFilterData,
  );

  const onFilterUpdate = React.useCallback(
    (key: string, value: string | { label: string; value: string } | undefined) =>
      setFilterData((prevValues) => ({ ...prevValues, [key]: value })),
    [setFilterData],
  );

  const onClearFilters = React.useCallback(
    () => setFilterData(initialModelRegistryFilterData),
    [setFilterData],
  );

  const filteredRegisteredModels = filterRegisteredModels(
    unfilteredRegisteredModels,
    modelVersions,
    filterData,
  );

  if (unfilteredRegisteredModels.length === 0) {
    return (
      <EmptyModelRegistryState
        headerIcon={SearchIcon}
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
      clearFilters={onClearFilters}
      registeredModels={filteredRegisteredModels}
      toolbarContent={
        <ToolbarContent>
          <ToolbarToggleGroup toggleIcon={<FilterIcon />} breakpoint="xl">
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
          </ToolbarToggleGroup>
        </ToolbarContent>
      }
    />
  );
};

export default RegisteredModelsArchiveListView;
