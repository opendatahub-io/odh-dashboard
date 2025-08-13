import React from 'react';
import EmptyDetailsView from '@odh-dashboard/internal/components/EmptyDetailsView';
import { ProjectObjectType, typedEmptyImage } from '@odh-dashboard/internal/concepts/design/utils';
import type { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import ModelServingPlatformSelectErrorAlert from '@odh-dashboard/internal/concepts/modelServing/Platforms/ModelServingPlatformSelectErrorAlert';
import { Stack, StackItem } from '@patternfly/react-core';
import { NavigateBackToRegistryButton } from '@odh-dashboard/internal/concepts/modelServing/NavigateBackToRegistryButton';
import { ModelServingPlatform } from '../../concepts/useProjectServingPlatform';
import { DeployButton } from '../deploy/DeployButton';
import { getDeploymentWizardRoute } from '../deploymentWizard/utils';

export const NoModelsView: React.FC<{
  platform: ModelServingPlatform;
  project: ProjectKind;
  errorSelectingPlatform?: Error;
  clearErrorSelectingPlatform: () => void;
}> = ({ platform, project, errorSelectingPlatform, clearErrorSelectingPlatform }) => (
  <EmptyDetailsView
    allowCreate
    iconImage={typedEmptyImage(ProjectObjectType.modelServer)}
    imageAlt="No deployed models"
    title={platform.properties.deployedModelsView.startHintTitle}
    description={
      <Stack hasGutter>
        {errorSelectingPlatform && (
          <ModelServingPlatformSelectErrorAlert
            error={errorSelectingPlatform}
            clearError={clearErrorSelectingPlatform}
          />
        )}
        <StackItem>{platform.properties.deployedModelsView.startHintDescription}</StackItem>
      </Stack>
    }
    createButton={
      <DeployButton
        project={project}
        createRoute={getDeploymentWizardRoute(`/projects/${project.metadata.name}`)}
      />
    }
    footerExtraChildren={<NavigateBackToRegistryButton isEmptyStateAction />}
  />
);
