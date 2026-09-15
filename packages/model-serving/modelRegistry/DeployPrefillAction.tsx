import React from 'react';
import { Button, ButtonVariant, Tooltip } from '@patternfly/react-core';
import useAvailablePlatformIds from './useAvailablePlatformIds';
import { useNavigateToDeploymentWizardWithData } from './useNavigateToDeploymentWizardWithData';
import { getDeployButtonState } from './getDeployButtonState';
import type { DeployPrefillActionProps } from '../src/shared/types/deploy-prefill';

/**
 * Deploy action registered as `core.action` by model-serving.
 *
 * Expects {@link DeployPrefillActionProps} from the page consumer via `componentProps`.
 */
const DeployPrefillAction: React.FC<DeployPrefillActionProps> = ({
  deployPrefill,
  deployPrefillLoaded,
  deployPrefillError,
  disabledTooltip,
}) => {
  const availablePlatformIds = useAvailablePlatformIds();
  const navigateToWizard = useNavigateToDeploymentWizardWithData(deployPrefill);

  const platformIdButtonState = React.useMemo(
    () => getDeployButtonState(availablePlatformIds, true),
    [availablePlatformIds],
  );

  const canInitializeWizardNavigation = deployPrefillLoaded && !deployPrefillError;
  const isLoading = canInitializeWizardNavigation && navigateToWizard === null;

  const buttonState = React.useMemo(() => {
    if (disabledTooltip) {
      return { enabled: false, tooltip: disabledTooltip };
    }

    if (
      platformIdButtonState.enabled &&
      canInitializeWizardNavigation &&
      navigateToWizard !== null
    ) {
      return { enabled: true };
    }

    return {
      enabled: false,
      tooltip: isLoading
        ? 'Loading deployment data...'
        : platformIdButtonState.tooltip || 'Deployment wizard is not available',
    };
  }, [
    disabledTooltip,
    platformIdButtonState.enabled,
    platformIdButtonState.tooltip,
    canInitializeWizardNavigation,
    navigateToWizard,
    isLoading,
  ]);

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

export default DeployPrefillAction;
