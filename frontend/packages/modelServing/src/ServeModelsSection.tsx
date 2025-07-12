import React from 'react';
import { ProjectDetailsContext } from '@odh-dashboard/internal/pages/projects/ProjectDetailsContext';
import { LazyCodeRefComponent, useExtensions } from '@odh-dashboard/plugin-core';
import {
  ModelDeploymentsProvider,
  ModelDeploymentsContext,
} from './concepts/ModelDeploymentsContext';
import { useProjectServingPlatform } from './concepts/useProjectServingPlatform';
import ModelPlatformSection from './components/overview/ModelPlatformSection';
import DeployedModelsSection from './components/overview/DeployedModelsSection';
import { isModelServingPlatformExtension } from '../extension-points';

const ServeModelsSectionContent: React.FC = () => {
  const { deployments } = React.useContext(ModelDeploymentsContext);
  const hasModels = !!deployments && deployments.length > 0;

  if (hasModels) {
    return <DeployedModelsSection />;
  }
  return <ModelPlatformSection />;
};

const ServeModelsSection: React.FC = () => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const availablePlatforms = useExtensions(isModelServingPlatformExtension);

  const { activePlatform } = useProjectServingPlatform(currentProject, availablePlatforms);

  // TODO: remove this once modelmesh and nim are fully supported plugins
  if (activePlatform?.properties.backport?.ServeModelsSection) {
    return (
      <LazyCodeRefComponent component={activePlatform.properties.backport.ServeModelsSection} />
    );
  }

  return (
    <ModelDeploymentsProvider
      modelServingPlatforms={activePlatform ? [activePlatform] : []}
      projects={[currentProject]}
    >
      <ServeModelsSectionContent />
    </ModelDeploymentsProvider>
  );
};

export default ServeModelsSection;
