import React from 'react';
import { ProjectDetailsContext } from '@odh-dashboard/internal/pages/projects/ProjectDetailsContext';
import { LazyCodeRefComponent } from '@odh-dashboard/plugin-core';
import DetailsSection from '@odh-dashboard/internal/pages/projects/screens/detail/DetailsSection';
import { ProjectSectionID } from '@odh-dashboard/internal/pages/projects/screens/detail/types';
import { useProjectServingPlatform } from './concepts/useProjectServingPlatform';
import { ModelDeploymentsProvider } from './concepts/ModelDeploymentsContext';
import ModelsProjectDetailsView from './components/projectDetails/ModelsProjectDetailsView';
import { useAvailableClusterPlatforms } from './concepts/useAvailableClusterPlatforms';

const LoadingSection: React.FC<{ error?: Error }> = ({ error }) => (
  <DetailsSection
    id={ProjectSectionID.MODEL_SERVER}
    isLoading
    isEmpty={false}
    emptyState={null}
    loadError={error}
  >
    {undefined}
  </DetailsSection>
);

const ModelsProjectDetailsTab: React.FC = () => {
  const { currentProject } = React.useContext(ProjectDetailsContext);

  const { clusterPlatforms, clusterPlatformsLoaded, clusterPlatformsError } =
    useAvailableClusterPlatforms();
  const { activePlatform } = useProjectServingPlatform(currentProject, clusterPlatforms);

  if (!clusterPlatformsLoaded || !currentProject.metadata.name) {
    return <LoadingSection error={clusterPlatformsError} />;
  }
  // TODO: remove this once modelmesh and nim are fully supported plugins
  if (activePlatform?.properties.backport?.ModelsProjectDetailsTab) {
    return (
      <LazyCodeRefComponent
        component={activePlatform.properties.backport.ModelsProjectDetailsTab}
        fallback={<LoadingSection />}
      />
    );
  }

  return (
    <ModelDeploymentsProvider
      modelServingPlatforms={activePlatform ? [activePlatform] : []}
      projects={[currentProject]}
    >
      <ModelsProjectDetailsView project={currentProject} platforms={clusterPlatforms} />
    </ModelDeploymentsProvider>
  );
};

export default ModelsProjectDetailsTab;
