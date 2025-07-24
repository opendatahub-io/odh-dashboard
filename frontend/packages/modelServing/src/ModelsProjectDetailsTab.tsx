import React from 'react';
import { ProjectDetailsContext } from '@odh-dashboard/internal/pages/projects/ProjectDetailsContext';
import { useExtensions, useResolvedExtensions } from '@odh-dashboard/plugin-core';
import { useProjectServingPlatform } from './concepts/useProjectServingPlatform';
import { ModelDeploymentsProvider } from './concepts/ModelDeploymentsContext';
import { ModelServingPlatformProvider } from './concepts/ModelServingPlatformContext';
import ModelsProjectDetailsView from './components/projectDetails/ModelsProjectDetailsView';
import {
  isModelServingPlatformExtension,
  isModelServingPlatformWatchDeployments,
} from '../extension-points';

const ModelsProjectDetailsTab: React.FC = () => {
  const { currentProject } = React.useContext(ProjectDetailsContext);

  const availablePlatforms = useExtensions(isModelServingPlatformExtension);
  const [deploymentWatchers] = useResolvedExtensions(isModelServingPlatformWatchDeployments);

  const { activePlatform } = useProjectServingPlatform(currentProject, availablePlatforms);
  return (
    <ModelServingPlatformProvider>
      <ModelDeploymentsProvider
        modelServingPlatforms={activePlatform ? [activePlatform] : []}
        watchParams={{ projects: [currentProject] }}
        deploymentWatchers={deploymentWatchers}
      >
        <ModelsProjectDetailsView project={currentProject} />
      </ModelDeploymentsProvider>
    </ModelServingPlatformProvider>
  );
};

export default ModelsProjectDetailsTab;
