import React from 'react';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { ModelRegistryContext } from '~/concepts/modelRegistry/context/ModelRegistryContext';
import useRegisteredModels from '~/concepts/modelRegistry/apiHooks/useRegisteredModels';
import EmptyRegisteredModels from './EmptyRegisteredModels';
import RegisteredModelsTableToolbar from './RegisteredModelsTableToolbar';
import RegisteredModelListView from './RegisteredModelListView';

const ModelRegistry: React.FC = () => {
  const { preferredModelRegistry } = React.useContext(ModelRegistryContext);
  const [registeredModels, loaded, loadError] = useRegisteredModels();

  return (
    <ApplicationsPage
      empty={registeredModels.size === 0}
      emptyStatePage={
        <>
          <RegisteredModelsTableToolbar />
          <EmptyRegisteredModels preferredModelRegistry={preferredModelRegistry?.metadata.name} />
        </>
      }
      title="Registered models"
      description="View and manage your registered models."
      loadError={loadError}
      loaded={loaded}
      provideChildrenPadding
    >
      <RegisteredModelListView registeredModels={registeredModels.items} />
    </ApplicationsPage>
  );
};

export default ModelRegistry;
