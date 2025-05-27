import React from 'react';
// eslint-disable-next-line import/no-extraneous-dependencies
import DetailsSection from '@odh-dashboard/internal/pages/projects/screens/detail/DetailsSection';
// eslint-disable-next-line import/no-extraneous-dependencies
import { ProjectSectionID } from '@odh-dashboard/internal/pages/projects/screens/detail/types';
import { Button, Flex, Label, Popover } from '@patternfly/react-core';
// eslint-disable-next-line import/no-extraneous-dependencies
import DashboardPopupIconButton from '@odh-dashboard/internal/concepts/dashboard/DashboardPopupIconButton';
import { OutlinedQuestionCircleIcon, PencilAltIcon } from '@patternfly/react-icons';
// eslint-disable-next-line import/no-extraneous-dependencies
import { ProjectObjectType } from '@odh-dashboard/internal/concepts/design/utils';
import { SelectPlatformView } from './SelectPlatformView';
import { NoModelsView } from './NoModelsView';
import DeploymentsTable from './DeploymentsTable';
import { ModelDeploymentsContext } from '../../concepts/ModelDeploymentsContext';
import { DeployButton } from '../deploy/DeployButton';
import { ModelServingPlatformContext } from '../../concepts/ModelServingPlatformContext';

const ModelsProjectDetailsView: React.FC = () => {
  const { availablePlatforms, project, platform, setPlatform, resetPlatform, newPlatformLoading } =
    React.useContext(ModelServingPlatformContext);
  const { deployments, loaded: deploymentsLoaded } = React.useContext(ModelDeploymentsContext);

  const isLoading =
    !project || !availablePlatforms || !!(platform && (!deployments || !deploymentsLoaded));
  const hasModels = !!deployments && deployments.length > 0;

  const activePlatform = React.useMemo(
    () =>
      availablePlatforms && availablePlatforms.length === 1 ? availablePlatforms[0] : platform,
    [availablePlatforms, platform],
  );

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
            {activePlatform && availablePlatforms && availablePlatforms.length > 1 && (
              <Button
                variant="link"
                isInline
                icon={<PencilAltIcon />}
                isLoading={newPlatformLoading !== undefined}
                isDisabled={newPlatformLoading !== undefined || hasModels}
                onClick={() => {
                  resetPlatform();
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
            setModelServingPlatform={setPlatform}
            newPlatformLoading={newPlatformLoading}
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
