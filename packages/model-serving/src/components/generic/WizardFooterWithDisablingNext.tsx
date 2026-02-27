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

type DeploymentFooterProps = {
  submitButtonText?: string;
  isSubmitDisabled?: boolean;
  onSave: (overwrite?: boolean) => void;
  onOverwrite?: () => void;
  onRefresh?: () => void;
  onCancel: () => void;
  isLoading?: boolean;
  error?: Error | null;
  clearError?: () => void;
};

/**
 * Used for the inside the `<Wizard />` component.
 * `onSave` and `onCancel` are not provided because they are handled by the useWizardContext inside.
 */
export const ModelDeploymentWizardFooter: React.FC<
  Omit<DeploymentFooterProps, 'onSave' | 'onCancel' | 'isSubmitDisabled'>
> = ({
  submitButtonText = 'Deploy model',
  onOverwrite,
  onRefresh,
  isLoading,
  error,
  clearError,
}) => {
  const { activeStep, steps, goToNextStep, goToPrevStep, close } = useWizardContext();

  const isFinalStep = activeStep.index === steps.length;

  return (
    <WizardFooterWrapper>
      <Stack hasGutter style={{ flex: 'auto' }}>
        {error && (
          <DeployErrorAlert
            error={error}
            clearError={clearError}
            onOverwrite={onOverwrite}
            onRefresh={onRefresh}
          />
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

/**
 * Used for the outside the `<Wizard />` component.
 */
export const ModelDeploymentFooter: React.FC<DeploymentFooterProps> = ({
  submitButtonText = 'Deploy model',
  isSubmitDisabled,
  onSave,
  onOverwrite,
  onRefresh,
  onCancel,
  isLoading,
  error,
  clearError,
}) => {
  return (
    // The WizardFooterWrapper basically just adds a <footer> tag to the DOM.
    <WizardFooterWrapper>
      <Stack hasGutter>
        {error && (
          <DeployErrorAlert
            error={error}
            clearError={clearError}
            onOverwrite={onOverwrite}
            onRefresh={onRefresh}
          />
        )}
        <StackItem>
          <ActionList>
            <ActionListGroup>
              <ActionListItem>
                <Button
                  data-testid="wizard-submit-button"
                  variant="primary"
                  onClick={() => onSave()}
                  isLoading={isLoading}
                  isDisabled={isLoading || isSubmitDisabled}
                >
                  {submitButtonText}
                </Button>
              </ActionListItem>
            </ActionListGroup>
            <ActionListGroup>
              <ActionListItem>
                <Button variant="link" onClick={onCancel}>
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

const DeployErrorAlert: React.FC<{
  onOverwrite?: () => void;
  onRefresh?: () => void;
  error?: Error | null;
  clearError?: () => void;
}> = ({ error, clearError, onOverwrite: onOverwrite, onRefresh }) => {
  return (
    <StackItem>
      <Alert
        data-testid="error-message-alert"
        isInline
        variant="danger"
        title="Error"
        actionClose={<AlertActionCloseButton onClose={clearError} />}
        actionLinks={
          // If this is a 409 conflict error on the model resource (not Secret or ServiceAccount)
          onOverwrite &&
          error instanceof K8sStatusError &&
          error.statusObject.code === 409 &&
          error.statusObject.details?.kind !== 'secrets' &&
          error.statusObject.details?.kind !== 'serviceaccounts' ? (
            <>
              <AlertActionLink onClick={onOverwrite}>Force update</AlertActionLink>
              {onRefresh && <AlertActionLink onClick={onRefresh}>Refresh</AlertActionLink>}
            </>
          ) : undefined
        }
      >
        {error instanceof Error ? error.message : error}
      </Alert>
    </StackItem>
  );
};
