import React from 'react';
import { Button, ButtonVariant, Tooltip } from '@patternfly/react-core';
import type { CatalogDeployActionComponentProps } from '@odh-dashboard/model-registry/shared';
import useAvailablePlatformIds from '../modelRegistry/useAvailablePlatformIds';
import { useNavigateToDeploymentWizardWithData } from '../modelRegistry/useNavigateToDeploymentWizardWithData';
import { getDeployButtonState } from '../modelRegistry/getDeployButtonState';

/**
 * Model catalog deploy action registered as `core.action` by model-serving.
 *
 * Expects catalog prefill data from the model-registry consumer via `componentProps`.
 * The extension is only registered when model serving and model catalog are available.
 */
const CatalogDeployAction: React.FC<CatalogDeployActionComponentProps> = ({
  deployPrefill,
  deployPrefillLoaded,
  deployPrefillError,
}) => {
  const availablePlatformIds = useAvailablePlatformIds();
  const navigateToWizard = useNavigateToDeploymentWizardWithData(deployPrefill);

  const platformIdButtonState = React.useMemo(
    () => getDeployButtonState(availablePlatformIds, true),
    [availablePlatformIds],
  );

  const canInitializeWizardNavigation = deployPrefillLoaded && !deployPrefillError;
  const isLoading = canInitializeWizardNavigation && navigateToWizard === null;

  const buttonState =
    platformIdButtonState.enabled && canInitializeWizardNavigation && navigateToWizard !== null
      ? { enabled: true }
      : {
          enabled: false,
          tooltip: isLoading
            ? 'Loading deployment data...'
            : platformIdButtonState.tooltip || 'Deployment wizard is not available',
        };

  const deployButton = (
    <Button
      id="deploy-button"
      aria-label="Deploy model"
      variant={ButtonVariant.primary}
      onClick={buttonState.enabled && navigateToWizard ? () => navigateToWizard() : undefined}
      isAriaDisabled={!buttonState.enabled}
      data-testid="deploy-button"
    >
      Deploy model
    </Button>
  );

  return buttonState.tooltip ? (
    <Tooltip content={buttonState.tooltip}>{deployButton}</Tooltip>
  ) : (
    deployButton
  );
};

export default CatalogDeployAction;
