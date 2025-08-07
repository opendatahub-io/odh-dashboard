import React from 'react';
import EmptyDetailsView from '@odh-dashboard/internal/components/EmptyDetailsView';
import { ProjectObjectType, typedEmptyImage } from '@odh-dashboard/internal/concepts/design/utils';
import type { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { NavigateBackToRegistryButton } from '@odh-dashboard/internal/concepts/modelServing/NavigateBackToRegistryButton';
import { ModelServingPlatform } from '../../concepts/useProjectServingPlatform';
import { DeployButton } from '../deploy/DeployButton';

export const NoModelsView: React.FC<{ platform: ModelServingPlatform; project: ProjectKind }> = ({
  platform,
  project,
}) => (
  <EmptyDetailsView
    allowCreate
    iconImage={typedEmptyImage(ProjectObjectType.modelServer)}
    imageAlt="No deployed models"
    title={platform.properties.deployedModelsView.startHintTitle}
    description={platform.properties.deployedModelsView.startHintDescription}
    createButton={<DeployButton project={project} />}
    footerExtraChildren={<NavigateBackToRegistryButton isEmptyStateAction />}
  />
);
