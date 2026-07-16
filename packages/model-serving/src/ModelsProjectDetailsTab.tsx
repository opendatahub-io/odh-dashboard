import React from 'react';
import { ProjectDetailsContext } from '@odh-dashboard/internal/pages/projects/ProjectDetailsContext';
import { LazyCodeRefComponent, useExtensions } from '@odh-dashboard/plugin-core';
// eslint-disable-next-line @odh-dashboard/no-restricted-imports
import DetailsSection from '@odh-dashboard/internal/pages/projects/screens/detail/DetailsSection';
import { ProjectSectionID } from '@odh-dashboard/internal/pages/projects/screens/detail/types';
import { useProjectServingPlatform } from './concepts/useProjectServingPlatform';
import { resolvePlatformOverride } from './concepts/resolvePlatformOverride';
import { ModelDeploymentsProvider } from './concepts/ModelDeploymentsContext';
import ModelsProjectDetailsView from './components/projectDetails/ModelsProjectDetailsView';
import { useAvailableClusterPlatforms } from './concepts/useAvailableClusterPlatforms';
import { isModelServingPlatformProjectDetailsTab } from '../extension-points';

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
  const projectDetailsTabExtensions = useExtensions(isModelServingPlatformProjectDetailsTab);

  const platformTabOverride = React.useMemo(
    () => resolvePlatformOverride(activePlatform, projectDetailsTabExtensions),
    [activePlatform, projectDetailsTabExtensions],
  );

  if (!clusterPlatformsLoaded || !currentProject.metadata.name) {
    return <LoadingSection error={clusterPlatformsError} />;
  }

  // TODO: remove this once modelmesh and nim are fully supported plugins
  if (platformTabOverride) {
    return (
      <LazyCodeRefComponent
        component={platformTabOverride.properties.component}
        fallback={<LoadingSection />}
      />
    );
  }

  return (
    <ModelDeploymentsProvider projects={[currentProject]}>
      <ModelsProjectDetailsView project={currentProject} platforms={clusterPlatforms} />
    </ModelDeploymentsProvider>
  );
};

export default ModelsProjectDetailsTab;
