import * as React from 'react';
import {
  Alert,
  Button,
  Dropdown,
  DropdownItem,
  DropdownList,
  MenuToggle,
  MenuToggleElement,
  SearchInput,
  ToolbarContent,
  ToolbarGroup,
  ToolbarItem,
  ToolbarToggleGroup,
} from '@patternfly/react-core';
import { EllipsisVIcon, FilterIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router';
import { ModelVersion, RegisteredModel } from '#~/concepts/modelRegistry/types';
import EmptyModelRegistryState from '#~/pages/modelRegistry/screens/components/EmptyModelRegistryState';
import {
  filterModelVersions,
  sortModelVersionsByCreateTime,
} from '#~/pages/modelRegistry/screens/utils';
import { modelVersionArchiveRoute } from '#~/routes/modelRegistry/modelVersionArchive';
import { registerVersionForModelRoute } from '#~/routes/modelRegistry/register';
import { ProjectObjectType, typedEmptyImage } from '#~/concepts/design/utils';
import { filterArchiveVersions, filterLiveVersions } from '#~/concepts/modelRegistry/utils';
import { ModelRegistriesContext } from '#~/concepts/modelRegistry/context/ModelRegistriesContext';
import FilterToolbar from '#~/components/FilterToolbar';
import {
  ModelRegistryVersionsFilterDataType,
  ModelRegistryVersionsFilterOptions,
  initialModelRegistryVersionsFilterData,
  modelRegistryVersionsFilterOptions,
} from '#~/pages/modelRegistry/screens/const';
import ModelVersionsTable from './ModelVersionsTable';

type ModelVersionListViewProps = {
  modelVersions: ModelVersion[];
  registeredModel: RegisteredModel;
  isArchiveModel?: boolean;
  refresh: () => void;
};

const ModelVersionListView: React.FC<ModelVersionListViewProps> = ({
  modelVersions,
  registeredModel: rm,
  isArchiveModel,
  refresh,
}) => {
  const unfilteredModelVersions = isArchiveModel
    ? modelVersions
    : filterLiveVersions(modelVersions);

  const archiveModelVersions = filterArchiveVersions(modelVersions);
  const navigate = useNavigate();
  const { preferredModelRegistry } = React.useContext(ModelRegistriesContext);
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

  const [isArchivedModelVersionKebabOpen, setIsArchivedModelVersionKebabOpen] =
    React.useState(false);

  const filteredModelVersions = filterModelVersions(unfilteredModelVersions, filterData);
  const date = rm.lastUpdateTimeSinceEpoch && new Date(parseInt(rm.lastUpdateTimeSinceEpoch));

  if (unfilteredModelVersions.length === 0) {
    if (isArchiveModel) {
      return (
        <EmptyModelRegistryState
          testid="empty-archive-model-versions"
          title="No versions"
          headerIcon={() => (
            <img
              src={typedEmptyImage(ProjectObjectType.registeredModels, 'MissingVersion')}
              alt="missing version"
            />
          )}
          description={`${rm.name} has no registered versions.`}
        />
      );
    }
    return (
      <EmptyModelRegistryState
        testid="empty-model-versions"
        title="No versions"
        headerIcon={() => (
          <img
            src={typedEmptyImage(ProjectObjectType.registeredModels, 'MissingVersion')}
            alt="missing version"
          />
        )}
        description={`${rm.name} has no active registered versions. Register a version to this model.`}
        primaryActionText="Register new version"
        primaryActionOnClick={() => {
          navigate(registerVersionForModelRoute(rm.id, preferredModelRegistry?.metadata.name));
        }}
        secondaryActionText={
          archiveModelVersions.length !== 0 ? 'View archived versions' : undefined
        }
        secondaryActionOnClick={() => {
          navigate(modelVersionArchiveRoute(rm.id, preferredModelRegistry?.metadata.name));
        }}
      />
    );
  }

  return (
    <>
      {isArchiveModel && (
        <Alert
          variant="warning"
          isInline
          title={`The ${rm.name} model and all of its versions were archived on ${
            date
              ? `${date.toLocaleString('en-US', {
                  month: 'long',
                  timeZone: 'UTC',
                })} ${date.getUTCDate()}, ${date.getUTCFullYear()}`
              : '--'
          }.  Versions can be restored by restoring the model.`}
        />
      )}
      <ModelVersionsTable
        refresh={refresh}
        isArchiveModel={isArchiveModel}
        registeredModel={rm}
        clearFilters={onClearFilters}
        modelVersions={sortModelVersionsByCreateTime(filteredModelVersions)}
        toolbarContent={
          <ToolbarContent>
            <ToolbarToggleGroup toggleIcon={<FilterIcon />} breakpoint="xl">
              <ToolbarGroup variant="filter-group">
                <FilterToolbar
                  data-testid="model-versions-table-toolbar"
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
            {!isArchiveModel && (
              <>
                <ToolbarItem>
                  <Button
                    variant="primary"
                    onClick={() => {
                      navigate(
                        registerVersionForModelRoute(rm.id, preferredModelRegistry?.metadata.name),
                      );
                    }}
                  >
                    Register new version
                  </Button>
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
                    popperProps={{ appendTo: 'inline' }}
                  >
                    <DropdownList>
                      <DropdownItem
                        onClick={() =>
                          navigate(
                            modelVersionArchiveRoute(rm.id, preferredModelRegistry?.metadata.name),
                          )
                        }
                      >
                        View archived versions
                      </DropdownItem>
                    </DropdownList>
                  </Dropdown>
                </ToolbarItem>
              </>
            )}
          </ToolbarContent>
        }
      />
    </>
  );
};

export default ModelVersionListView;
