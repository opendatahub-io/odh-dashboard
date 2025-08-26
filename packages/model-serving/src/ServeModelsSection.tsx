import React from 'react';
import { ProjectDetailsContext } from '@odh-dashboard/internal/pages/projects/ProjectDetailsContext';
import { LazyCodeRefComponent } from '@odh-dashboard/plugin-core';
import { Bullseye, Card, CardBody, Spinner } from '@patternfly/react-core';
import CollapsibleSection from '@odh-dashboard/internal/concepts/design/CollapsibleSection';
import {
  ModelDeploymentsProvider,
  ModelDeploymentsContext,
} from './concepts/ModelDeploymentsContext';
import {
  useProjectServingPlatform,
  type ModelServingPlatform,
} from './concepts/useProjectServingPlatform';
import ModelPlatformSection from './components/overview/ModelPlatformSection';
import DeployedModelsSection from './components/overview/DeployedModelsSection';
import { useAvailableClusterPlatforms } from './concepts/useAvailableClusterPlatforms';

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

const ServeModelsSectionContent: React.FC<{ platforms: ModelServingPlatform[] }> = ({
  platforms,
}) => {
  const { deployments, loaded: deploymentsLoaded } = React.useContext(ModelDeploymentsContext);

  if (!deploymentsLoaded) {
    return <EmptyLoadingSection />;
  }

  const hasModels = !!deployments && deployments.length > 0;
  if (hasModels) {
    return <DeployedModelsSection platforms={platforms} />;
  }
  return <ModelPlatformSection platforms={platforms} />;
};

const ServeModelsSection: React.FC = () => {
  const { currentProject } = React.useContext(ProjectDetailsContext);

  const { clusterPlatforms, clusterPlatformsLoaded } = useAvailableClusterPlatforms();
  const { activePlatform } = useProjectServingPlatform(currentProject, clusterPlatforms);

  if (!clusterPlatformsLoaded || !currentProject.metadata.name) {
    return <EmptyLoadingSection />;
  }

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
      <ServeModelsSectionContent platforms={clusterPlatforms} />
    </ModelDeploymentsProvider>
  );
};

export default ServeModelsSection;
