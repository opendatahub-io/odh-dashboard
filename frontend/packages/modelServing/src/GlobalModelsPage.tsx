import React from 'react';
import GlobalDeploymentsView from './components/global/GlobalDeploymentsView';
import { ModelDeploymentsProvider } from './concepts/ModelDeploymentsContext';
import { ProjectPlatformContext, ProjectPlatformProvider } from './concepts/ProjectPlatformContext';

const WithDeploymentsData: React.FC = () => {
  const { availablePlatforms, allProjects } = React.useContext(ProjectPlatformContext);

  return (
    <ModelDeploymentsProvider modelServingPlatform={availablePlatforms} projects={allProjects}>
      <GlobalDeploymentsView />
    </ModelDeploymentsProvider>
  );
};

const GlobalModelsPage: React.FC = () => (
  <ProjectPlatformProvider>
    <WithDeploymentsData />
  </ProjectPlatformProvider>
);

export default GlobalModelsPage;
