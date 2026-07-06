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
};

/**
 * Wizard footer used inside PatternFly `<Wizard />`.
 * Cancel/Back use wizard context; final-step submit is handled by Wizard `onSave` via `goToNextStep`.
 */
const DeployAgentWizardFooter: React.FC<DeployAgentWizardFooterProps> = ({
  submitButtonText = 'Deploy agent',
  getIsNextDisabled,
}) => {
  const { activeStep, steps, goToNextStep, goToPrevStep, close } = useWizardContext();
  const isFinalStep = activeStep.index === steps.length;
  const isBackDisabled = activeStep.index === 1;
  const isNextDisabled = getIsNextDisabled?.(activeStep.index) ?? false;
  const nextButtonLabel = isFinalStep ? submitButtonText : 'Next';

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
      isAriaDisabled={isNextDisabled}
      data-testid={isFinalStep ? 'deploy-agent-wizard-submit' : 'deploy-agent-wizard-next'}
    >
      {nextButtonLabel}
    </Button>
  );

  return (
    <WizardFooterWrapper>
      <ActionList>
        <ActionListGroup>
          <ActionListItem>
            {isBackDisabled ? (
              <Tooltip content="You are on the first step.">{backButton}</Tooltip>
            ) : (
              backButton
            )}
          </ActionListItem>
          <ActionListItem>
            {isNextDisabled ? (
              <Tooltip content="Complete all required fields on this step before continuing.">
                {nextButton}
              </Tooltip>
            ) : (
              nextButton
            )}
          </ActionListItem>
        </ActionListGroup>
        <ActionListGroup>
          <ActionListItem>
            <Button variant="link" onClick={close} data-testid="deploy-agent-wizard-cancel">
              Cancel
            </Button>
          </ActionListItem>
        </ActionListGroup>
      </ActionList>
    </WizardFooterWrapper>
  );
};

export default DeployAgentWizardFooter;
