import React from 'react';
import DetailsSection from '@odh-dashboard/internal/pages/projects/screens/detail/DetailsSection';
import { ProjectSectionID } from '@odh-dashboard/internal/pages/projects/screens/detail/types';
import { Button, Flex, Label, Popover } from '@patternfly/react-core';
import DashboardPopupIconButton from '@odh-dashboard/internal/concepts/dashboard/DashboardPopupIconButton';
import { OutlinedQuestionCircleIcon, PencilAltIcon } from '@patternfly/react-icons';
import { ProjectObjectType } from '@odh-dashboard/internal/concepts/design/utils';
import type { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { useExtensions } from '@odh-dashboard/plugin-core';
import { SelectPlatformView } from './SelectPlatformView';
import { NoModelsView } from './NoModelsView';
import { useProjectServingPlatform } from '../../concepts/useProjectServingPlatform';
import DeploymentsTable from '../deployments/DeploymentsTable';
import { ModelDeploymentsContext } from '../../concepts/ModelDeploymentsContext';
import { DeployButton } from '../deploy/DeployButton';
import { isModelServingPlatformExtension } from '../../../extension-points';

const ModelsProjectDetailsView: React.FC<{
  project: ProjectKind;
}> = ({ project }) => {
  const availablePlatforms = useExtensions(isModelServingPlatformExtension);
  const { deployments, loaded: deploymentsLoaded } = React.useContext(ModelDeploymentsContext);

  const {
    activePlatform,
    projectPlatform,
    setProjectPlatform,
    resetProjectPlatform,
    newProjectPlatformLoading,
  } = useProjectServingPlatform(project, availablePlatforms);

  const isLoading =
    !project.metadata.name || !!(projectPlatform && (!deployments || !deploymentsLoaded));
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
      actions={
        hasModels && activePlatform
          ? [<DeployButton key="deploy-button" platform={activePlatform} variant="secondary" />]
          : undefined
      }
      labels={[
        [
          <Flex gap={{ default: 'gapSm' }} key="serving-platform-label">
            <Label data-testid="serving-platform-label">
              {activePlatform?.properties.enableCardText.enabledText}
            </Label>
            {activePlatform && availablePlatforms.length > 1 && (
              <Button
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
            platforms={availablePlatforms}
            setModelServingPlatform={setProjectPlatform}
            newPlatformLoading={newProjectPlatformLoading}
          />
        )
      }
    >
      {activePlatform &&
        (!hasModels ? (
          <NoModelsView platform={activePlatform} />
        ) : (
          <DeploymentsTable modelServingPlatform={activePlatform} deployments={deployments} />
        ))}
    </DetailsSection>
  );
};

export default ModelsProjectDetailsView;
