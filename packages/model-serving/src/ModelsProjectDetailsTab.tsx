import React from 'react';
import { ProjectDetailsContext } from '@odh-dashboard/internal/pages/projects/ProjectDetailsContext';
import { LazyCodeRefComponent, useExtensions } from '@odh-dashboard/plugin-core';
import DetailsSection from '@odh-dashboard/internal/pages/projects/screens/detail/DetailsSection';
import { ProjectObjectType } from '@odh-dashboard/internal/concepts/design/utils';
import { ProjectSectionID } from '@odh-dashboard/internal/pages/projects/screens/detail/types';
import { useProjectServingPlatform } from './concepts/useProjectServingPlatform';
import { ModelDeploymentsProvider } from './concepts/ModelDeploymentsContext';
import ModelsProjectDetailsView from './components/projectDetails/ModelsProjectDetailsView';
import { isModelServingPlatformExtension } from '../extension-points';

const ModelsProjectDetailsTab: React.FC = () => {
  const { currentProject } = React.useContext(ProjectDetailsContext);

  const availablePlatforms = useExtensions(isModelServingPlatformExtension);

  const { activePlatform } = useProjectServingPlatform(currentProject, availablePlatforms);

  // TODO: remove this once modelmesh and nim are fully supported plugins
  if (activePlatform?.properties.backport?.ModelsProjectDetailsTab) {
    return (
      <LazyCodeRefComponent
        component={activePlatform.properties.backport.ModelsProjectDetailsTab}
        fallback={
          <DetailsSection
            objectType={ProjectObjectType.model}
            id={ProjectSectionID.MODEL_SERVER}
            isLoading
            isEmpty={false}
            emptyState={null}
          >
            {undefined}
          </DetailsSection>
        }
      />
    );
  }

  return (
    <ModelDeploymentsProvider
      modelServingPlatforms={activePlatform ? [activePlatform] : []}
      projects={[currentProject]}
    >
      <ModelsProjectDetailsView project={currentProject} />
    </ModelDeploymentsProvider>
  );
};

export default ModelsProjectDetailsTab;
