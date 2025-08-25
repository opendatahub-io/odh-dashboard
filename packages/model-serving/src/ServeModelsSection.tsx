import React from 'react';
import { ProjectDetailsContext } from '@odh-dashboard/internal/pages/projects/ProjectDetailsContext';
import { LazyCodeRefComponent, useExtensions } from '@odh-dashboard/plugin-core';
import { Bullseye, Card, CardBody, Spinner } from '@patternfly/react-core';
import CollapsibleSection from '@odh-dashboard/internal/concepts/design/CollapsibleSection';
import {
  ModelDeploymentsProvider,
  ModelDeploymentsContext,
} from './concepts/ModelDeploymentsContext';
import { useProjectServingPlatform } from './concepts/useProjectServingPlatform';
import ModelPlatformSection from './components/overview/ModelPlatformSection';
import DeployedModelsSection from './components/overview/DeployedModelsSection';
import { useAvailableClusterPlatforms } from './concepts/useAvailableClusterPlatforms';
import { isModelServingPlatformExtension } from '../extension-points';

const EmptyLoadingSection: React.FC = () => (
  <CollapsibleSection title="Serve models" data-testid="section-model-server">
    <Card>
      <CardBody>
        <Bullseye>
          <Spinner />
        </Bullseye>
      </CardBody>
    </Card>
  </CollapsibleSection>
);

const ServeModelsSectionContent: React.FC = () => {
  const { deployments, loaded: deploymentsLoaded } = React.useContext(ModelDeploymentsContext);
  const { clusterPlatforms, clusterPlatformsLoaded } = useAvailableClusterPlatforms();

  if (!clusterPlatformsLoaded || !deploymentsLoaded) {
    return <EmptyLoadingSection />;
  }

  const hasModels = !!deployments && deployments.length > 0;
  if (hasModels) {
    return <DeployedModelsSection />;
  }
  return <ModelPlatformSection platforms={clusterPlatforms} />;
};

const ServeModelsSection: React.FC = () => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const platformExtensions = useExtensions(isModelServingPlatformExtension);
  const { activePlatform } = useProjectServingPlatform(currentProject, platformExtensions);

  // TODO: remove this once modelmesh and nim are fully supported plugins
  if (activePlatform?.properties.backport?.ServeModelsSection) {
    return (
      <LazyCodeRefComponent
        component={activePlatform.properties.backport.ServeModelsSection}
        fallback={<EmptyLoadingSection />}
      />
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
