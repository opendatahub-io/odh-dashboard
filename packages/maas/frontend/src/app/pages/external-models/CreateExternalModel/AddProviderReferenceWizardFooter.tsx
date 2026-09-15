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
  submitLabel: string;
  onAdd: () => void;
};

const AddProviderReferenceWizardFooter: React.FC<AddProviderReferenceWizardFooterProps> = ({
  isNextDisabled,
  isAddDisabled,
  submitLabel,
  onAdd,
}) => {
  const { activeStep, steps, goToNextStep, goToPrevStep, close } = useWizardContext();
  const isFirstStep = activeStep.index === 1;
  const isLastStep = activeStep.index === steps.length;

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
                onClick={onAdd}
                isDisabled={isAddDisabled}
                data-testid="add-provider-reference-submit"
              >
                {submitLabel}
              </Button>
            </ActionListItem>
          ) : (
            <ActionListItem>
              <Button
                variant="primary"
                onClick={goToNextStep}
                isDisabled={isNextDisabled}
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
