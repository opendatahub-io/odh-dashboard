import React from 'react';
import { Button, Tooltip } from '@patternfly/react-core';
import { ModelServingPlatform } from '../../concepts/useProjectServingPlatform';

export const DeployButton: React.FC<{
  platform?: ModelServingPlatform;
  variant?: 'primary' | 'secondary';
  isDisabled?: boolean;
}> = ({ platform, variant = 'primary', isDisabled }) => {
  const deployButton = (
    <Button
      variant={variant}
      data-testid="deploy-button"
      // onClick={() => {
      //   do something
      // }}
      isAriaDisabled={isDisabled}
    >
      Deploy Model
    </Button>
  );
  if (!platform) {
    return <Tooltip content="To deploy a model, select a project.">{deployButton}</Tooltip>;
  }
  return <>{deployButton}</>;
};
