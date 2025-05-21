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
  ToolbarFilter,
  ToolbarGroup,
  ToolbarItem,
  ToolbarToggleGroup,
} from '@patternfly/react-core';
import { EllipsisVIcon, FilterIcon } from '@patternfly/react-icons';
import { useNavigate } from 'react-router';
import { SearchType } from '~/concepts/dashboard/DashboardSearchField';
import { ModelVersion, RegisteredModel } from '~/concepts/modelRegistry/types';
import SimpleSelect, { SimpleSelectOption } from '~/components/SimpleSelect';
import EmptyModelRegistryState from '~/pages/modelRegistry/screens/components/EmptyModelRegistryState';
import {
  filterModelVersions,
  sortModelVersionsByCreateTime,
} from '~/pages/modelRegistry/screens/utils';
import { modelVersionArchiveRoute } from '~/routes/modelRegistry/modelVersionArchive';
import { registerVersionForModelRoute } from '~/routes/modelRegistry/register';
import { asEnumMember } from '~/utilities/utils';
import { ProjectObjectType, typedEmptyImage } from '~/concepts/design/utils';
import { filterArchiveVersions, filterLiveVersions } from '~/concepts/modelRegistry/utils';
import { ModelRegistriesContext } from '~/concepts/modelRegistry/context/ModelRegistriesContext';
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

  const [searchType, setSearchType] = React.useState<SearchType>(SearchType.KEYWORD);
  const [search, setSearch] = React.useState('');

  const searchTypes = [SearchType.KEYWORD, SearchType.AUTHOR];

  const [isArchivedModelVersionKebabOpen, setIsArchivedModelVersionKebabOpen] =
    React.useState(false);

  const filteredModelVersions = filterModelVersions(unfilteredModelVersions, search, searchType);
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
        clearFilters={() => setSearch('')}
        modelVersions={sortModelVersionsByCreateTime(filteredModelVersions)}
        toolbarContent={
          <ToolbarContent>
            <ToolbarToggleGroup toggleIcon={<FilterIcon />} breakpoint="xl">
              <ToolbarGroup variant="filter-group">
                <ToolbarFilter
                  labels={search === '' ? [] : [search]}
                  deleteLabel={() => setSearch('')}
                  deleteLabelGroup={() => setSearch('')}
                  categoryName={searchType}
                >
                  <SimpleSelect
                    dataTestId="model-versions-table-filter"
                    options={searchTypes.map(
                      (key): SimpleSelectOption => ({
                        key,
                        label: key,
                      }),
                    )}
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
                <ToolbarItem>
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
