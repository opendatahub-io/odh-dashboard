import * as React from 'react';
import { ProjectDetailsContext } from '~/pages/projects/ProjectDetailsContext';
import useServingPlatformStatuses from '~/pages/modelServing/useServingPlatformStatuses';
import { getProjectModelServingPlatform } from '~/pages/modelServing/screens/projects/utils';
import { ServingRuntimePlatform } from '~/types';
import NoProjectServingEnabledSection from '~/pages/projects/screens/detail/overview/serverModels/NoProjectServingEnabledSection';
import PlatformSelectSection from './PlatformSelectSection';
import DeployedModelsSection from './deployedModels/DeployedModelsSection';

const ServeModelsSection: React.FC = () => {
  const servingPlatformStatuses = useServingPlatformStatuses();

  const kServeEnabled = servingPlatformStatuses.kServe.enabled;
  const modelMeshEnabled = servingPlatformStatuses.modelMesh.enabled;

  const { currentProject } = React.useContext(ProjectDetailsContext);

  const { platform: currentProjectServingPlatform } = getProjectModelServingPlatform(
    currentProject,
    servingPlatformStatuses,
  );

  if (kServeEnabled && modelMeshEnabled && !currentProjectServingPlatform) {
    return <PlatformSelectSection />;
  }

  if (!kServeEnabled && !modelMeshEnabled) {
    return <NoProjectServingEnabledSection />;
  }

  return (
    <DeployedModelsSection
      isMultiPlatform={
        modelMeshEnabled && currentProjectServingPlatform === ServingRuntimePlatform.MULTI
      }
    />
  );
};

export default ServeModelsSection;
