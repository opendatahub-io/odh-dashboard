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
> & {
  unavailableErrorPage?: React.ReactNode;
};

const ModelRegistry: React.FC<ModelRegistryProps> = ({ unavailableErrorPage, ...pageProps }) => {
  const [registeredModels, modelsLoaded, modelsLoadError, refreshModels] = useRegisteredModels();
  const [modelVersions, versionsLoaded, versionsLoadError, refreshVersions] = useModelVersions();

  const loaded = modelsLoaded && versionsLoaded;
  const loadError = modelsLoadError || versionsLoadError;
  const hasCustomErrorPage = loadError && unavailableErrorPage;

  const refresh = React.useCallback(() => {
    refreshModels();
    refreshVersions();
  }, [refreshModels, refreshVersions]);

  return (
    <ApplicationsPage
      {...pageProps}
      title={<TitleWithIcon title="Registry" objectType={ProjectObjectType.registeredModels} />}
      description="Select a model registry to view and manage your registered models. Model registries provide a structured and organized way to store, share, version, deploy, and track models."
      headerContent={
        <ModelRegistrySelectorNavigator
          getRedirectPath={(modelRegistryName) => modelRegistryRoute(modelRegistryName)}
        />
      }
      loadError={hasCustomErrorPage ? undefined : loadError}
      loaded={hasCustomErrorPage ? true : loaded}
      empty={hasCustomErrorPage ? true : pageProps.empty}
      emptyStatePage={hasCustomErrorPage ? unavailableErrorPage : pageProps.emptyStatePage}
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
