import React from 'react';
import { Button, Tooltip, type ButtonProps } from '@patternfly/react-core';
import { ProjectKind } from '@odh-dashboard/internal/k8sTypes';
import { useKueueConfiguration } from '@odh-dashboard/internal/concepts/hardwareProfiles/kueueUtils';
import { useServingRuntimeTemplates } from '../../concepts/servingRuntimeTemplates/useServingRuntimeTemplates';
import { useNavigateToDeploymentWizard } from '../deploymentWizard/useNavigateToDeploymentWizard';

export const DeployButton: React.FC<{
  project: ProjectKind | null;
  variant?: ButtonProps['variant'];
}> = ({ project, variant = 'primary' }) => {
  const navigateToDeploymentWizard = useNavigateToDeploymentWizard();

  const { isKueueDisabled } = useKueueConfiguration(project ?? undefined);
  const [globalTemplates, globalTemplatesLoaded] = useServingRuntimeTemplates();
  const isMissingTemplates = globalTemplates.length === 0 && globalTemplatesLoaded;

  const disableButton = isMissingTemplates || isKueueDisabled;
  const disabledReason = isMissingTemplates
    ? 'At least one serving runtime must be enabled to deploy a model. Contact your administrator.'
    : 'To deploy a model, select a project.';

  const deployButton = (
    <Button
      data-testid="deploy-button"
      variant={variant}
      onClick={() => navigateToDeploymentWizard(project?.metadata.name)}
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
        content={disabledReason}
      >
        {deployButton}
      </Tooltip>
    );
  }

  return deployButton;
};
