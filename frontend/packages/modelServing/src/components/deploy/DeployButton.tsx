import React from 'react';
import { Button } from '@patternfly/react-core';
import { ModelServingPlatform } from '../../concepts/modelServingPlatforms';

export const DeployButton: React.FC<{
  platform: ModelServingPlatform;
  variant?: 'primary' | 'secondary';
}> = ({ platform, variant = 'primary' }) => (
  <Button variant={variant}>{platform.properties.deployedModelsView.deployButtonText}</Button>
);
