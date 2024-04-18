import React from 'react';
import ApplicationsPage from '~/pages/ApplicationsPage';
import useRegisteredModels from '~/concepts/modelRegistry/apiHooks/useRegisteredModels';
import { ModelRegistrySelectorContext } from '~/concepts/modelRegistry/context/ModelRegistrySelectorContext';
import TitleWithIcon from '~/concepts/design/TitleWithIcon';
import { ProjectObjectType } from '~/concepts/design/utils';
import RegisteredModelListView from './RegisteredModelListView';
import EmptyModelRegistryState from './EmptyModelRegistryState';
import ModelRegistrySelectorNavigator from './ModelRegistrySelectorNavigator';

const ModelRegistry: React.FC = () => {
  const { preferredModelRegistry } = React.useContext(ModelRegistrySelectorContext);
  const [registeredModels, loaded, loadError] = useRegisteredModels();

  return (
    <ApplicationsPage
      empty={registeredModels.size === 0}
      emptyStatePage={
        <EmptyModelRegistryState
          title="No models in selected registry"
          description={`${preferredModelRegistry?.metadata.name} has no models registered to it. Register model to this registry, or select a different one.`}
          primaryActionText="Register model"
          secondaryActionText="View archived models"
          primaryActionOnClick={() => {
            // TODO: Add primary action
          }}
          secondaryActionOnClick={() => {
            // TODO: Add secondary action
          }}
        />
      }
      title={
        <TitleWithIcon title="Deployed models" objectType={ProjectObjectType.deployedModels} />
      }
      description="View and manage your registered models."
      headerContent={
        <ModelRegistrySelectorNavigator
          getRedirectPath={(modelRegistryName) => `/modelRegistry/${modelRegistryName}`}
        />
      }
      loadError={loadError}
      loaded={loaded}
      provideChildrenPadding
      removeChildrenTopPadding
    >
      <RegisteredModelListView registeredModels={registeredModels.items} />
    </ApplicationsPage>
  );
};

export default ModelRegistry;
