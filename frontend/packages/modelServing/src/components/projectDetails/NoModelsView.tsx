import React from 'react';
import EmptyDetailsView from '@odh-dashboard/internal/components/EmptyDetailsView';
import { ProjectObjectType, typedEmptyImage } from '@odh-dashboard/internal/concepts/design/utils';
import { ModelServingPlatform } from '../../concepts/useProjectServingPlatform';
import { DeployButton } from '../deploy/DeployButton';

export const NoModelsView: React.FC<{ platform: ModelServingPlatform }> = ({ platform }) => (
  <EmptyDetailsView
    allowCreate
    iconImage={typedEmptyImage(ProjectObjectType.modelServer)}
    // imageAlt={isProjectModelMesh ? 'No model servers' : 'No deployed models'}
    title={platform.properties.deployedModelsView.startHintTitle}
    description={platform.properties.deployedModelsView.startHintDescription}
    createButton={<DeployButton platform={platform} />}
    // footerExtraChildren={
    //   deployingFromRegistry stuff
    // }
  />
);
