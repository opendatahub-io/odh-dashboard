import React from 'react';
import {
  Button,
  ActionListItem,
  ActionListGroup,
  ActionList,
  useWizardContext,
  WizardFooterWrapper,
  StackItem,
  Alert,
  Stack,
  AlertActionCloseButton,
} from '@patternfly/react-core';

type WizardFooterWithDisablingNextProps = {
  error?: Error | null;
  clearError?: () => void;
  isLoading?: boolean;
  submitButtonText?: string;
};

// When clicking Next, the default WizardFooter will skip over disabled steps, but we want to prevent that and just disable the Next button
// Also allows an error message to be displayed in the footer
export const WizardFooterWithDisablingNext: React.FC<WizardFooterWithDisablingNextProps> = ({
  error,
  clearError,
  isLoading,
  submitButtonText = 'Deploy model',
}) => {
  const { activeStep, steps, goToNextStep, goToPrevStep, close } = useWizardContext();

  const isFinalStep = activeStep.index === steps.length;

  return (
    <WizardFooterWrapper>
      <Stack hasGutter style={{ flex: 'auto' }}>
        {error && (
          <StackItem>
            <Alert
              data-testid="error-message-alert"
              isInline
              variant="danger"
              title="Error"
              actionClose={<AlertActionCloseButton onClose={clearError} />}
            >
              {error instanceof Error ? error.message : error}
            </Alert>
          </StackItem>
        )}
        <StackItem>
          <ActionList>
            <ActionListGroup>
              <ActionListItem>
                <Button
                  variant="secondary"
                  onClick={goToPrevStep}
                  isDisabled={activeStep.index === 1}
                >
                  Back
                </Button>
              </ActionListItem>
              <ActionListItem>
                <Button
                  variant="primary"
                  onClick={goToNextStep}
                  isLoading={isLoading}
                  isDisabled={isLoading || steps[activeStep.index]?.isDisabled}
                >
                  {isFinalStep ? submitButtonText : 'Next'}
                </Button>
              </ActionListItem>
            </ActionListGroup>
            <ActionListGroup>
              <ActionListItem>
                <Button variant="link" onClick={close}>
                  Cancel
                </Button>
              </ActionListItem>
            </ActionListGroup>
          </ActionList>
        </StackItem>
      </Stack>
    </WizardFooterWrapper>
  );
};
