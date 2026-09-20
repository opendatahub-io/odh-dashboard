import React from 'react';
import { Button, Tooltip, type ButtonProps } from '@patternfly/react-core';
import type { ProjectKind } from '@odh-dashboard/k8s-core';
import { useNavigateToDeploymentWizard } from '../deploymentWizard/useNavigateToDeploymentWizard';
import { useCanMakeNewDeployment } from '../../concepts/useCanMakeNewDeployment';
import type { DeployWizardNavSource } from '../../shared/tracking/deployWizardTracking';

const FROM_PROJECT_NAV_SOURCE: DeployWizardNavSource = { fromProject: true };

export const DeployButton: React.FC<{
  project: ProjectKind | null;
  variant?: ButtonProps['variant'];
  fromProject?: boolean;
}> = ({ project, variant = 'primary', fromProject = false }) => {
  const navigateToDeploymentWizard = useNavigateToDeploymentWizard(
    undefined,
    undefined,
    undefined,
    undefined,
    fromProject ? FROM_PROJECT_NAV_SOURCE : undefined,
  );

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
