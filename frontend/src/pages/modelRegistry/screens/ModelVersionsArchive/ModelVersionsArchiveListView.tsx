import * as React from 'react';
import {
  SearchInput,
  ToolbarContent,
  ToolbarGroup,
  ToolbarToggleGroup,
} from '@patternfly/react-core';
import { FilterIcon, SearchIcon } from '@patternfly/react-icons';
import { ModelVersion, RegisteredModel } from '#~/concepts/modelRegistry/types';
import { filterModelVersions } from '#~/pages/modelRegistry/screens/utils';
import EmptyModelRegistryState from '#~/pages/modelRegistry/screens/components/EmptyModelRegistryState';
import FilterToolbar from '#~/components/FilterToolbar';
import {
  initialModelRegistryVersionsFilterData,
  ModelRegistryVersionsFilterDataType,
  ModelRegistryVersionsFilterOptions,
  modelRegistryVersionsFilterOptions,
} from '#~/pages/modelRegistry/screens/const';
import ModelVersionsArchiveTable from './ModelVersionsArchiveTable';

type ModelVersionsArchiveListViewProps = {
  modelVersions: ModelVersion[];
  registeredModel: RegisteredModel;
  refresh: () => void;
};

const ModelVersionsArchiveListView: React.FC<ModelVersionsArchiveListViewProps> = ({
  modelVersions: unfilteredmodelVersions,
  registeredModel,
  refresh,
}) => {
  const [filterData, setFilterData] = React.useState<ModelRegistryVersionsFilterDataType>(
    initialModelRegistryVersionsFilterData,
  );

  const onFilterUpdate = React.useCallback(
    (key: string, value: string | { label: string; value: string } | undefined) =>
      setFilterData((prevValues) => ({ ...prevValues, [key]: value })),
    [setFilterData],
  );

  const onClearFilters = React.useCallback(
    () => setFilterData(initialModelRegistryVersionsFilterData),
    [setFilterData],
  );

  const filteredModelVersions = filterModelVersions(unfilteredmodelVersions, filterData);

  if (unfilteredmodelVersions.length === 0) {
    return (
      <EmptyModelRegistryState
        headerIcon={SearchIcon}
        testid="empty-archive-state"
        title="No archived versions"
        description="You can archive the active versions that you no longer use. You can restore an archived versions to make it active."
      />
    );
  }

  return (
    <ModelVersionsArchiveTable
      refresh={refresh}
      registeredModel={registeredModel}
      clearFilters={onClearFilters}
      modelVersions={filteredModelVersions}
      toolbarContent={
        <ToolbarContent>
          <ToolbarToggleGroup toggleIcon={<FilterIcon />} breakpoint="xl">
            <ToolbarGroup variant="filter-group">
              <FilterToolbar
                data-testid="model-versions-archive-table-toolbar"
                filterOptions={modelRegistryVersionsFilterOptions}
                filterOptionRenders={{
                  [ModelRegistryVersionsFilterOptions.keyword]: ({ onChange, ...props }) => (
                    <SearchInput
                      {...props}
                      aria-label="Filter by keyword"
                      placeholder="Filter by keyword"
                      onChange={(_event, value) => onChange(value)}
                    />
                  ),
                  [ModelRegistryVersionsFilterOptions.author]: ({ onChange, ...props }) => (
                    <SearchInput
                      {...props}
                      aria-label="Filter by author"
                      placeholder="Filter by author"
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

export default ModelVersionsArchiveListView;
