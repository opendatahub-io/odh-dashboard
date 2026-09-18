import React from 'react';
import {
  ActionList,
  ActionListGroup,
  ActionListItem,
  Button,
  useWizardContext,
  WizardFooterWrapper,
} from '@patternfly/react-core';

type AddProviderReferenceWizardFooterProps = {
  isNextDisabled: boolean;
  isAddDisabled: boolean;
  isNextLoading?: boolean;
  isAddLoading?: boolean;
  submitLabel: string;
  onAdd?: () => boolean | Promise<boolean>;
  onNext?: () => boolean | Promise<boolean>;
};

const AddProviderReferenceWizardFooter: React.FC<AddProviderReferenceWizardFooterProps> = ({
  isNextDisabled,
  isAddDisabled,
  isNextLoading = false,
  isAddLoading = false,
  submitLabel,
  onAdd,
  onNext,
}) => {
  const { activeStep, steps, goToNextStep, goToPrevStep, close } = useWizardContext();
  const isFirstStep = activeStep.index === 1;
  const isLastStep = activeStep.index === steps.length;

  const handleNext = async () => {
    if (onNext) {
      const canProceed = await onNext();
      if (!canProceed) {
        return;
      }
    }
    goToNextStep();
  };

  const handleAdd = async () => {
    if (onAdd) {
      await onAdd();
    }
  };

  return (
    <WizardFooterWrapper>
      <ActionList>
        <ActionListGroup>
          <ActionListItem>
            <Button
              variant="secondary"
              onClick={goToPrevStep}
              isDisabled={isFirstStep}
              data-testid="provider-ref-wizard-back"
            >
              Back
            </Button>
          </ActionListItem>
          {isLastStep ? (
            <ActionListItem>
              <Button
                variant="primary"
                onClick={handleAdd}
                isDisabled={isAddDisabled}
                isLoading={isAddLoading}
                data-testid="add-provider-reference-submit"
              >
                {submitLabel}
              </Button>
            </ActionListItem>
          ) : (
            <ActionListItem>
              <Button
                variant="primary"
                onClick={handleNext}
                isDisabled={isNextDisabled}
                isLoading={isNextLoading}
                data-testid="provider-ref-wizard-next"
              >
                Next
              </Button>
            </ActionListItem>
          )}
        </ActionListGroup>
        <ActionListGroup>
          <ActionListItem>
            <Button variant="link" onClick={close} data-testid="provider-ref-wizard-cancel">
              Cancel
            </Button>
          </ActionListItem>
        </ActionListGroup>
      </ActionList>
    </WizardFooterWrapper>
  );
};

export default AddProviderReferenceWizardFooter;
