import React from 'react';
import ApplicationsPage from '~/pages/ApplicationsPage';
import { ProjectObjectType } from '~/concepts/design/utils';
import TitleWithIcon from '~/concepts/design/TitleWithIcon';
import ModelRegistryEmpty from '~/pages/modelRegistry/ModelRegistryEmpty';
import { ModelRegistryContext } from '~/concepts/modelRegistry/context/ModelRegistryContext';
import useRegisteredModels from '~/concepts/modelRegistry/apiHooks/useRegisteredModels';
import RegisteredModelListView from './RegisteredModelListView';

const ModelRegistry: React.FC = () => {
  const { modelRegistries } = React.useContext(ModelRegistryContext);
  const [registeredModels, loaded, loadError] = useRegisteredModels();

  return (
    <ApplicationsPage
      empty={modelRegistries.length === 0}
      emptyStatePage={<ModelRegistryEmpty />}
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
