import React from 'react';
import ApplicationsPage from '#~/pages/ApplicationsPage';
import { modelRegistryRoute } from '#~/routes/modelRegistry/registryBase';
import useRegisteredModels from '#~/concepts/modelRegistry/apiHooks/useRegisteredModels';
import useModelVersions from '#~/concepts/modelRegistry/apiHooks/useModelVersions';
import TitleWithIcon from '#~/concepts/design/TitleWithIcon';
import { ProjectObjectType } from '#~/concepts/design/utils';
import RegisteredModelListView from './RegisteredModels/RegisteredModelListView';
import ModelRegistrySelectorNavigator from './ModelRegistrySelectorNavigator';

type ModelRegistryProps = Omit<
  React.ComponentProps<typeof ApplicationsPage>,
  | 'title'
  | 'description'
  | 'loadError'
  | 'loaded'
  | 'provideChildrenPadding'
  | 'removeChildrenTopPadding'
  | 'headerContent'
>;

const ModelRegistry: React.FC<ModelRegistryProps> = ({ ...pageProps }) => {
  const [registeredModels, modelsLoaded, modelsLoadError, refreshModels] = useRegisteredModels();
  const [modelVersions, versionsLoaded, versionsLoadError, refreshVersions] = useModelVersions();

  const loaded = modelsLoaded && versionsLoaded;
  const loadError = modelsLoadError || versionsLoadError;

  const refresh = React.useCallback(() => {
    refreshModels();
    refreshVersions();
  }, [refreshModels, refreshVersions]);

  return (
    <ApplicationsPage
      {...pageProps}
      title={
        <TitleWithIcon title="Model registry" objectType={ProjectObjectType.registeredModels} />
      }
      description="Select a model registry to view and manage your registered models. Model registries provide a structured and organized way to store, share, version, deploy, and track models."
      headerContent={
        <ModelRegistrySelectorNavigator
          getRedirectPath={(modelRegistryName) => modelRegistryRoute(modelRegistryName)}
        />
      }
      loadError={loadError}
      loaded={loaded}
      provideChildrenPadding
      removeChildrenTopPadding
    >
      <RegisteredModelListView
        registeredModels={registeredModels.items}
        modelVersions={modelVersions.items}
        refresh={refresh}
      />
    </ApplicationsPage>
  );
};

export default ModelRegistry;
