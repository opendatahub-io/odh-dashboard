import React from 'react';
import ApplicationsPage from '~/pages/ApplicationsPage';
import useRegisteredModels from '~/concepts/modelRegistry/apiHooks/useRegisteredModels';
import TitleWithIcon from '~/concepts/design/TitleWithIcon';
import { ProjectObjectType } from '~/concepts/design/utils';
import { filterLiveModels } from '~/concepts/modelRegistry/utils';
import RegisteredModelListView from './RegisteredModels/RegisteredModelListView';
import ModelRegistrySelectorNavigator from './ModelRegistrySelectorNavigator';
import { modelRegistryUrl } from './routeUtils';

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
  const [registeredModels, loaded, loadError, refresh] = useRegisteredModels();

  return (
    <ApplicationsPage
      {...pageProps}
      title={<TitleWithIcon title="Model registry" objectType={ProjectObjectType.deployedModels} />}
      description="View and manage all of your registered models. Registering models to model registry allows you to manage their content, metadata, versions, and user access settings."
      headerContent={
        <ModelRegistrySelectorNavigator
          getRedirectPath={(modelRegistryName) => modelRegistryUrl(modelRegistryName)}
        />
      }
      loadError={loadError}
      loaded={loaded}
      provideChildrenPadding
      removeChildrenTopPadding
    >
      <RegisteredModelListView
        registeredModels={filterLiveModels(registeredModels.items)}
        refresh={refresh}
      />
    </ApplicationsPage>
  );
};

export default ModelRegistry;
