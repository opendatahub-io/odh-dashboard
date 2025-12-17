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
  AlertActionLink,
} from '@patternfly/react-core';
import { K8sStatusError } from '@odh-dashboard/internal/api/errorUtils';

type WizardFooterWithDisablingNextProps = {
  error?: Error | null;
  clearError?: () => void;
  isLoading?: boolean;
  submitButtonText?: string;
  isAdvancedSettingsStepValid?: boolean; //TODO: Remove line when summary page added
  onSave?: (overwrite?: boolean) => void;
  overwriteSupported?: boolean;
  onRefresh?: () => void;
};

// When clicking Next, the default WizardFooter will skip over disabled steps, but we want to prevent that and just disable the Next button
// Also allows an error message to be displayed in the footer
export const WizardFooterWithDisablingNext: React.FC<WizardFooterWithDisablingNextProps> = ({
  error,
  clearError,
  isLoading,
  submitButtonText = 'Deploy model',
  isAdvancedSettingsStepValid = true, //TODO: Remove line when summary page added
  onSave,
  overwriteSupported,
  onRefresh,
}) => {
  const { activeStep, steps, goToNextStep, goToPrevStep, close } = useWizardContext();

  const isFinalStep = activeStep.index === steps.length;
  const isNextDisabled = !isAdvancedSettingsStepValid; //TODO: Remove line when summary page added

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
              actionLinks={
                // If this is a 409 conflict error on the model resource (not Secret or ServiceAccount)
                onSave &&
                overwriteSupported &&
                error instanceof K8sStatusError &&
                error.statusObject.code === 409 &&
                error.statusObject.details?.kind !== 'secrets' &&
                error.statusObject.details?.kind !== 'serviceaccounts' ? (
                  <>
                    <AlertActionLink onClick={() => onSave(true)}>Force update</AlertActionLink>
                    {onRefresh && <AlertActionLink onClick={onRefresh}>Refresh</AlertActionLink>}
                  </>
                ) : undefined
              }
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
                  data-testid={isFinalStep ? 'wizard-submit-button' : 'wizard-next-button'}
                  variant="primary"
                  onClick={goToNextStep}
                  isLoading={isLoading}
                  isDisabled={isLoading || steps[activeStep.index]?.isDisabled || isNextDisabled} //TODO: Remove isNextDisabled when summary page added
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
