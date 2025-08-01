import React from 'react';
import { Button, Tooltip, type ButtonProps } from '@patternfly/react-core';
import { useServingRuntimeTemplates } from '../../concepts/servingRuntimeTemplates/useServingRuntimeTemplates';
import { ModelServingPlatform } from '../../concepts/useProjectServingPlatform';

export const DeployButton: React.FC<{
  platform?: ModelServingPlatform;
  variant?: ButtonProps['variant'];
  isDisabled?: boolean;
}> = ({ platform, variant = 'primary', isDisabled }) => {
  const [templates, templatesLoaded] = useServingRuntimeTemplates();
  const isMissingTemplates = templates.length === 0 || !templatesLoaded;

  const disableButton = !platform || isDisabled || isMissingTemplates;
  const disabledReason = isMissingTemplates
    ? 'At least one serving runtime must be enabled to deploy a model. Contact your administrator.'
    : 'To deploy a model, select a project.';

  const deployButton = (
    <Button
      data-testid="deploy-button"
      variant={variant}
      // onClick={() => {
      //   do something
      // }}
      isAriaDisabled={disableButton}
      isInline={variant === 'link'}
    >
      Deploy model
    </Button>
  );

  if (disableButton) {
    return (
      <Tooltip
        data-testid="deploy-model-tooltip"
        aria-label="Model Serving Action Info"
        content={<div>{disabledReason}</div>}
      >
        {deployButton}
      </Tooltip>
    );
  }
  return <>{deployButton}</>;
};
