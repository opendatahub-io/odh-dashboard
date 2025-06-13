import React from 'react';
import useServingPlatformStatuses from '@odh-dashboard/internal/pages/modelServing/useServingPlatformStatuses';
import { getProjectModelServingPlatform } from '@odh-dashboard/internal/pages/modelServing/screens/projects/utils';
import { ProjectDetailsContext } from '@odh-dashboard/internal/pages/projects/ProjectDetailsContext';
import { ServingRuntimePlatform } from '@odh-dashboard/internal/types';
import ServeModelsCard from './concepts/ModelPlatformSection';

const ServeModelsSection: React.FC = () => {
  const servingPlatformStatuses = useServingPlatformStatuses(true);
  const {
    modelMesh: { enabled: modelMeshEnabled },
    platformEnabledCount,
  } = servingPlatformStatuses;

  const { currentProject } = React.useContext(ProjectDetailsContext);

  const { platform: currentProjectServingPlatform } = getProjectModelServingPlatform(
    currentProject,
    servingPlatformStatuses,
  );

  if (platformEnabledCount > 1 && !currentProjectServingPlatform) {
    return <ServeModelsCard isMultiPlatform={false} />;
  }
  return (
    <ServeModelsCard
      isMultiPlatform={
        modelMeshEnabled && currentProjectServingPlatform === ServingRuntimePlatform.MULTI
      }
    />
  );
};

export default ServeModelsSection;
