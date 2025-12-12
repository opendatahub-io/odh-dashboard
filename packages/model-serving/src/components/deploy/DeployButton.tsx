import React from 'react';
import { Button, Tooltip, type ButtonProps } from '@patternfly/react-core';
import { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { useNavigateToDeploymentWizard } from '../deploymentWizard/useNavigateToDeploymentWizard';
import { useCanMakeNewDeployment } from '../../concepts/useCanMakeNewDeployment';

export const DeployButton: React.FC<{
  project: ProjectKind | null;
  variant?: ButtonProps['variant'];
}> = ({ project, variant = 'primary' }) => {
  const navigateToDeploymentWizard = useNavigateToDeploymentWizard();

  const { disabled, disabledReason } = useCanMakeNewDeployment(project);

  const deployButton = (
    <Button
      data-testid="deploy-button"
      variant={variant}
      onClick={() => navigateToDeploymentWizard(project?.metadata.name)}
      isAriaDisabled={disabled}
      isInline={variant === 'link'}
    >
      Deploy model
    </Button>
  );

  if (disabled) {
    return (
      <Tooltip
        data-testid="deploy-model-tooltip"
        aria-label="Model Serving Action Info"
        content={disabledReason}
      >
        {deployButton}
      </Tooltip>
    );
  }

  return deployButton;
};
