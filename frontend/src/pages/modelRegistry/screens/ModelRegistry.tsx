import React from 'react';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { ProjectObjectType } from '~/concepts/design/utils';
import TitleWithIcon from '~/concepts/design/TitleWithIcon';
import { ModelRegistryContext } from '~/concepts/modelRegistry/context/ModelRegistryContext';
import useRegisteredModels from '~/concepts/modelRegistry/apiHooks/useRegisteredModels';
import RegisteredModelListView from './RegisteredModelListView';
import EmptyRegisteredModels from './EmptyRegisteredModels';
import RegisteredModelsTableToolbar from './RegisteredModelsTableToolbar';

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
      title={
        <TitleWithIcon title="Registered models" objectType={ProjectObjectType.registeredModels} />
      }
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
