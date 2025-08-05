import React from 'react';
import DetailsSection from '@odh-dashboard/internal/pages/projects/screens/detail/DetailsSection';
import { ProjectSectionID } from '@odh-dashboard/internal/pages/projects/screens/detail/types';
import { Button, Flex, Label, Popover } from '@patternfly/react-core';
import DashboardPopupIconButton from '@odh-dashboard/internal/concepts/dashboard/DashboardPopupIconButton';
import { OutlinedQuestionCircleIcon, PencilAltIcon } from '@patternfly/react-icons';
import { ProjectObjectType } from '@odh-dashboard/internal/concepts/design/utils';
import type { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { SelectPlatformView } from './SelectPlatformView';
import { NoModelsView } from './NoModelsView';
import { ProjectDeploymentsTable } from './ProjectDeploymentsTable';
import { useAvailableClusterPlatforms } from '../../concepts/useAvailableClusterPlatforms';
import { useProjectServingPlatform } from '../../concepts/useProjectServingPlatform';
import { ModelDeploymentsContext } from '../../concepts/ModelDeploymentsContext';
import { DeployButton } from '../deploy/DeployButton';

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
    newProjectPlatformLoading,
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
          ? [<DeployButton key="deploy-button" project={project} variant="secondary" />]
          : undefined
      }
      labels={[
        [
          <Flex gap={{ default: 'gapSm' }} key="serving-platform-label">
            <Label data-testid="serving-platform-label">
              {activePlatform?.properties.enableCardText.enabledText}
            </Label>
            {activePlatform && platforms.length > 1 && (
              <Button
                data-testid="change-serving-platform-button"
                variant="link"
                isInline
                icon={<PencilAltIcon />}
                isLoading={newProjectPlatformLoading !== undefined}
                isDisabled={newProjectPlatformLoading !== undefined || hasModels}
                onClick={() => {
                  resetProjectPlatform();
                }}
              >
                Change
              </Button>
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
            newPlatformLoading={newProjectPlatformLoading}
          />
        )
      }
    >
      {activePlatform &&
        (!hasModels ? (
          <NoModelsView platform={activePlatform} project={project} />
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
