import React from 'react';
import { EmptyDetailsView, ProjectObjectType, typedEmptyImage } from '@odh-dashboard/ui-core';
import type { ProjectKind } from '@odh-dashboard/k8s-core';
import { Stack, StackItem } from '@patternfly/react-core';
import { ModelServingPlatformSelectErrorAlert } from '@odh-dashboard/model-serving/shared/components';
import { ModelServingPlatform } from '../../concepts/useProjectServingPlatform';
import { DeployButton } from '../deploy/DeployButton';

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
    createButton={<DeployButton project={project} />}
  />
);
