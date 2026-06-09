import * as React from 'react';
import { Button } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { ProjectObjectType, typedEmptyImage, ToolbarFilter, FilterState } from 'mod-arch-shared';
import { useResolvedExtensions } from '@odh-dashboard/plugin-core';
import { ModelVersion, RegisteredModel } from '~/app/types';
import { ModelRegistrySelectorContext } from '~/app/context/ModelRegistrySelectorContext';
import { isModelRegistryVersionDeploymentsContextExtension } from '~/odh/extension-points/deploy';
import {
  modelTransferJobsUrl,
  registeredModelArchiveUrl,
  registerModelUrl,
} from '~/app/pages/modelRegistry/screens/routeUtils';
import EmptyModelRegistryState from '~/app/pages/modelRegistry/screens/components/EmptyModelRegistryState';
import { filterRegisteredModels, getTextValue } from '~/app/pages/modelRegistry/screens/utils';
import { filterArchiveModels, filterLiveModels } from '~/app/utils';
import {
  ModelRegistryFilterDataType,
  ModelRegistryFilterOptions,
  registeredModelsFilterConfig,
  registeredModelsVisibleFilterKeys,
  registeredModelsInitialFilterValues,
} from '~/app/pages/modelRegistry/screens/const';
import RegisteredModelsToolbarActions from '~/app/pages/modelRegistry/screens/RegisteredModels/RegisteredModelsToolbarActions';
import ExtendedRegisteredModelTable from './ExtendedRegisteredModelTable';

type ExtendedRegisteredModelListViewProps = {
  registeredModels: RegisteredModel[];
  modelVersions: ModelVersion[];
  refresh: () => void;
};

const ExtendedRegisteredModelListView: React.FC<ExtendedRegisteredModelListViewProps> = ({
  registeredModels,
  modelVersions,
  refresh,
}) => {
  const navigate = useNavigate();
  const { preferredModelRegistry } = React.useContext(ModelRegistrySelectorContext);
  const [filterValues, setFilterValues] = React.useState<FilterState<ModelRegistryFilterOptions>>(
    registeredModelsInitialFilterValues,
  );
  const unfilteredRegisteredModels = filterLiveModels(registeredModels);
  const archiveRegisteredModels = filterArchiveModels(registeredModels);

  const [deploymentsContextExtensions, deploymentsContextLoaded] = useResolvedExtensions(
    isModelRegistryVersionDeploymentsContextExtension,
  );

  const onFilterChange = React.useCallback(
    (key: ModelRegistryFilterOptions, value: string | string[]) =>
      setFilterValues((prev) => ({ ...prev, [key]: value })),
    [],
  );

  const onClearAllFilters = React.useCallback(
    () => setFilterValues(registeredModelsInitialFilterValues),
    [],
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
          preferredModelRegistry?.name ?? ''
        } has no active registered models. Register a model in this registry, or select a different registry.`}
        primaryActionText="Register model"
        secondaryActionText={
          archiveRegisteredModels.length !== 0 ? 'View archived models' : undefined
        }
        primaryActionOnClick={() => {
          navigate(registerModelUrl(preferredModelRegistry?.name));
        }}
        secondaryActionOnClick={() => {
          navigate(registeredModelArchiveUrl(preferredModelRegistry?.name));
        }}
        customAction={
          <Button
            data-testid="empty-model-registry-transfer-jobs-action"
            variant="link"
            onClick={() => navigate(modelTransferJobsUrl(preferredModelRegistry?.name))}
          >
            View model transfer jobs
          </Button>
        }
      />
    );
  }

  const filterData: ModelRegistryFilterDataType = {
    [ModelRegistryFilterOptions.keyword]: getTextValue(
      filterValues[ModelRegistryFilterOptions.keyword],
    ),
    [ModelRegistryFilterOptions.owner]: getTextValue(
      filterValues[ModelRegistryFilterOptions.owner],
    ),
  };

  const filteredRegisteredModels = filterRegisteredModels(
    unfilteredRegisteredModels,
    modelVersions,
    filterData,
  );

  const tableContent = (
    <ExtendedRegisteredModelTable
      refresh={refresh}
      clearFilters={onClearAllFilters}
      registeredModels={filteredRegisteredModels}
      modelVersions={modelVersions}
      toolbarContent={
        <ToolbarFilter
          filterConfig={registeredModelsFilterConfig}
          visibleFilterKeys={registeredModelsVisibleFilterKeys}
          filterValues={filterValues}
          onFilterChange={onFilterChange}
          onClearAllFilters={onClearAllFilters}
          toolbarActions={<RegisteredModelsToolbarActions />}
          testIdPrefix="registered-models-table"
        />
      }
    />
  );

  if (deploymentsContextLoaded && deploymentsContextExtensions.length > 0) {
    return deploymentsContextExtensions.reduce((content, extension) => {
      const { DeploymentsProvider } = extension.properties;
      return (
        <DeploymentsProvider
          key={extension.properties.DeploymentsProvider.toString()}
          mrName={preferredModelRegistry?.name}
        >
          {() => tableContent}
        </DeploymentsProvider>
      );
    }, tableContent);
  }

  return tableContent;
};

export default ExtendedRegisteredModelListView;
