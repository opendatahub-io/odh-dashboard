import React from 'react';
import { ProjectDetailsContext } from '@odh-dashboard/internal/pages/projects/ProjectDetailsContext';
import { useProjectServingPlatform } from './concepts/useProjectServingPlatform';
import { ModelDeploymentsProvider } from './concepts/ModelDeploymentsContext';
import {
  ModelServingPlatformContext,
  ModelServingPlatformProvider,
} from './concepts/ModelServingPlatformContext';
import ModelsProjectDetailsView from './components/projectDetails/ModelsProjectDetailsView';

const WithDeploymentsData: React.FC = () => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const { availablePlatforms } = React.useContext(ModelServingPlatformContext);

  const { activePlatform } = useProjectServingPlatform(currentProject, availablePlatforms);

  // Certain platform-specific properties, such as hooks, require the `platform`
  // to be always defined and truthy.
  if (activePlatform && currentProject.metadata.name) {
    return (
      <ModelDeploymentsProvider modelServingPlatform={activePlatform} project={currentProject}>
        <ModelsProjectDetailsView project={currentProject} />
      </ModelDeploymentsProvider>
    );
  }
  return <ModelsProjectDetailsView project={currentProject} />;
};

const ModelsProjectDetailsTab: React.FC = () => (
  <ModelServingPlatformProvider>
    <WithDeploymentsData />
  </ModelServingPlatformProvider>
);

export default ModelsProjectDetailsTab;
