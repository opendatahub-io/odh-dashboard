import React from 'react';
import ApplicationsPage from '~/pages/ApplicationsPage';
import useRegisteredModels from '~/concepts/modelRegistry/apiHooks/useRegisteredModels';
import TitleWithIcon from '~/concepts/design/TitleWithIcon';
import { ProjectObjectType } from '~/concepts/design/utils';
import RegisteredModelListView from './RegisteredModels/RegisteredModelListView';
import ModelRegistrySelectorNavigator from './ModelRegistrySelectorNavigator';
import { filterLiveModels } from './utils';
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
      title={
        <TitleWithIcon title="Registered models" objectType={ProjectObjectType.deployedModels} />
      }
      description="View and manage your registered models."
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
