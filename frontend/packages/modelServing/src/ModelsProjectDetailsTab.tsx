import React from 'react';
import ModelsProjectDetailsView from './components/projectDetails/ModelsProjectDetailsView';
import { ModelDeploymentsProvider } from './concepts/ModelDeploymentsContext';
import {
  ModelServingPlatformContext,
  ModelServingPlatformProvider,
} from './concepts/ModelServingPlatformContext';

const WithDeploymentsData: React.FC = () => {
  const { platform, project } = React.useContext(ModelServingPlatformContext);

  // Certain platform-specific properties, such as hooks, require the `platform`
  // to be always defined and truthy.
  if (platform && project) {
    return (
      <ModelDeploymentsProvider modelServingPlatform={platform} project={project}>
        <ModelsProjectDetailsView />
      </ModelDeploymentsProvider>
    );
  }
  return <ModelsProjectDetailsView />;
};

const ModelsProjectDetailsTab: React.FC = () => (
  <ModelServingPlatformProvider>
    <WithDeploymentsData />
  </ModelServingPlatformProvider>
);

export default ModelsProjectDetailsTab;
