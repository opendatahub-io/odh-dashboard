import * as React from 'react';
import {
  ActionList,
  ActionListGroup,
  ActionListItem,
  Button,
  Tooltip,
  useWizardContext,
  WizardFooterWrapper,
} from '@patternfly/react-core';

type DeployAgentWizardFooterProps = {
  submitButtonText?: string;
  getIsNextDisabled?: (stepIndex: number) => boolean;
  isSubmitting?: boolean;
};

/**
 * Wizard footer used inside PatternFly `<Wizard />`.
 * Cancel/Back use wizard context; final-step submit is handled by Wizard `onSave` via `goToNextStep`.
 */
const DeployAgentWizardFooter: React.FC<DeployAgentWizardFooterProps> = ({
  submitButtonText = 'Deploy agent',
  getIsNextDisabled,
  isSubmitting = false,
}) => {
  const { activeStep, steps, goToNextStep, goToPrevStep, close } = useWizardContext();
  const isFinalStep = activeStep.index === steps.length;
  const isBackDisabled = activeStep.index === 1 || isSubmitting;
  const isNextDisabled = (getIsNextDisabled?.(activeStep.index) ?? false) || isSubmitting;
  const nextButtonLabel = isFinalStep ? (isSubmitting ? 'Deploying...' : submitButtonText) : 'Next';

  const handleBack = React.useCallback(() => {
    if (!isBackDisabled) {
      goToPrevStep();
    }
  }, [isBackDisabled, goToPrevStep]);

  const handleNext = React.useCallback(() => {
    if (!isNextDisabled) {
      goToNextStep();
    }
  }, [isNextDisabled, goToNextStep]);

  const backButton = (
    <Button
      variant="secondary"
      onClick={handleBack}
      isDisabled={isBackDisabled}
      isAriaDisabled={isBackDisabled}
      data-testid="deploy-agent-wizard-back"
    >
      Back
    </Button>
  );

  const nextButton = (
    <Button
      variant="primary"
      onClick={handleNext}
      isDisabled={isFinalStep ? isNextDisabled : false}
      isAriaDisabled={!isFinalStep && isNextDisabled}
      isLoading={isFinalStep && isSubmitting}
      data-testid={isFinalStep ? 'deploy-agent-wizard-submit' : 'deploy-agent-wizard-next'}
    >
      {nextButtonLabel}
    </Button>
  );

  const nextButtonWithTooltip =
    isNextDisabled && !isSubmitting ? (
      <Tooltip content="Complete all required fields on this step before continuing.">
        {nextButton}
      </Tooltip>
    ) : (
      nextButton
    );

  return (
    <WizardFooterWrapper>
      <ActionList>
        <ActionListGroup>
          <ActionListItem>
            {isBackDisabled && activeStep.index === 1 ? (
              <Tooltip content="You are on the first step.">{backButton}</Tooltip>
            ) : (
              backButton
            )}
          </ActionListItem>
          <ActionListItem>{nextButtonWithTooltip}</ActionListItem>
        </ActionListGroup>
        <ActionListGroup>
          <ActionListItem>
            <Button
              variant="link"
              onClick={close}
              isDisabled={isSubmitting}
              data-testid="deploy-agent-wizard-cancel"
            >
              Cancel
            </Button>
          </ActionListItem>
        </ActionListGroup>
      </ActionList>
    </WizardFooterWrapper>
  );
};

export default DeployAgentWizardFooter;
