import React from 'react';
import { Button } from '@patternfly/react-core';
// eslint-disable-next-line import/no-extraneous-dependencies
import EmptyDetailsView from '@odh-dashboard/internal/components/EmptyDetailsView';
// eslint-disable-next-line import/no-extraneous-dependencies
import { ProjectObjectType, typedEmptyImage } from '@odh-dashboard/internal/concepts/design/utils';
import { ModelServingPlatform } from '../../concepts/modelServingPlatforms';

export const NoModelsView: React.FC<{ platform: ModelServingPlatform }> = ({ platform }) => (
  <EmptyDetailsView
    allowCreate
    iconImage={typedEmptyImage(ProjectObjectType.modelServer)}
    // imageAlt={isProjectModelMesh ? 'No model servers' : 'No deployed models'}
    title={platform.properties.deployedModelsView.startHintTitle}
    description={platform.properties.deployedModelsView.startHintDescription}
    createButton={<Button>{platform.properties.deployedModelsView.deployButtonText}</Button>}
    // footerExtraChildren={
    //   deployingFromRegistry stuff
    // }
  />
);
