import React from 'react';
import DetailsSection from '@odh-dashboard/internal/pages/projects/screens/detail/DetailsSection';
import { ProjectSectionID } from '@odh-dashboard/internal/pages/projects/screens/detail/types';
import { Flex, Label, Popover } from '@patternfly/react-core';
import DashboardPopupIconButton from '@odh-dashboard/internal/concepts/dashboard/DashboardPopupIconButton';
import { OutlinedQuestionCircleIcon } from '@patternfly/react-icons';
import { ProjectObjectType } from '@odh-dashboard/internal/concepts/design/utils';
import type { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { SelectPlatformView } from './SelectPlatformView';
import { NoModelsView } from './NoModelsView';
import { ProjectDeploymentsTable } from './ProjectDeploymentsTable';
import { useAvailableClusterPlatforms } from '../../concepts/useAvailableClusterPlatforms';
import { useProjectServingPlatform } from '../../concepts/useProjectServingPlatform';
import { ModelDeploymentsContext } from '../../concepts/ModelDeploymentsContext';
import { DeployButton } from '../deploy/DeployButton';
import { ResetPlatformButton } from '../platforms/ResetPlatformButton';
import { getDeploymentWizardRoute } from '../deploymentWizard/utils';

const ModelsProjectDetailsView: React.FC<{
  project: ProjectKind;
}> = ({ project }) => {
  const {
    clusterPlatforms: platforms,
    clusterPlatformsLoaded,
    clusterPlatformsError,
  } = useAvailableClusterPlatforms();
  const {
    deployments,
    loaded: deploymentsLoaded,
    errors: deploymentsErrors,
  } = React.useContext(ModelDeploymentsContext);

  const {
    activePlatform,
    projectPlatform,
    setProjectPlatform,
    resetProjectPlatform,
    loadingState,
    projectPlatformError,
    clearProjectPlatformError,
  } = useProjectServingPlatform(project, platforms);

  const isLoading =
    !project.metadata.name || !clusterPlatformsLoaded || (!!projectPlatform && !deploymentsLoaded);
  const hasModels = !!deployments && deployments.length > 0;

  return (
    <DetailsSection
      objectType={ProjectObjectType.model}
      id={ProjectSectionID.MODEL_SERVER}
      title={hasModels ? 'Models and model servers' : undefined}
      popover={
        hasModels ? (
          <Popover
            headerContent="About models"
            bodyContent="Deploy models to test them and integrate them into applications. Deploying a model makes it accessible via an API, enabling you to return predictions based on data inputs."
          >
            <DashboardPopupIconButton
              icon={<OutlinedQuestionCircleIcon />}
              aria-label="More info"
            />
          </Popover>
        ) : undefined
      }
      isLoading={isLoading}
      loadError={deploymentsErrors?.[0] || clusterPlatformsError}
      actions={
        hasModels && activePlatform
          ? [
              <DeployButton
                key="deploy-button"
                project={project}
                variant="secondary"
                createRoute={getDeploymentWizardRoute(`/projects/${project.metadata.name}`)}
              />,
            ]
          : undefined
      }
      labels={[
        [
          <Flex gap={{ default: 'gapSm' }} key="serving-platform-label">
            <Label data-testid="serving-platform-label">
              {activePlatform?.properties.enableCardText.enabledText}
            </Label>
            {projectPlatform && ( // projectPlatform gets the actual saved value in the project labels
              <ResetPlatformButton
                platforms={platforms}
                hasDeployments={hasModels}
                isLoading={loadingState.type === 'reset'}
                onReset={resetProjectPlatform}
              />
            )}
          </Flex>,
        ],
      ]}
      isEmpty={!activePlatform}
      emptyState={
        !isLoading && (
          <SelectPlatformView
            platforms={platforms}
            setModelServingPlatform={setProjectPlatform}
            newPlatformLoadingId={loadingState.platform?.properties.id}
            errorSelectingPlatform={projectPlatformError ?? undefined}
            clearErrorSelectingPlatform={clearProjectPlatformError}
          />
        )
      }
    >
      {activePlatform &&
        (!hasModels ? (
          <NoModelsView
            platform={activePlatform}
            project={project}
            errorSelectingPlatform={projectPlatformError ?? undefined}
            clearErrorSelectingPlatform={clearProjectPlatformError}
          />
        ) : (
          <ProjectDeploymentsTable
            modelServingPlatform={activePlatform}
            deployments={deployments}
            loaded={deploymentsLoaded}
          />
        ))}
    </DetailsSection>
  );
};

export default ModelsProjectDetailsView;
