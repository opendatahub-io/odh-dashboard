import React from 'react';
import { PageSection, Stack, StackItem, ActionGroup, Button } from '@patternfly/react-core';
import RegisterModelErrors from './RegisterModelErrors';

type RegistrationFormFooterProps = {
  submitLabel: string;
  submitError?: Error;
  isSubmitDisabled: boolean;
  isSubmitting: boolean;
  onSubmit: () => void;
  onCancel: () => void;
  errorName?: string;
  versionName?: string;
  modelName?: string;
};

const RegistrationFormFooter: React.FC<RegistrationFormFooterProps> = ({
  submitLabel,
  submitError,
  isSubmitDisabled,
  isSubmitting,
  onSubmit,
  onCancel,
  errorName,
  versionName,
  modelName,
}) => (
  <PageSection hasBodyWrapper={false} stickyOnBreakpoint={{ default: 'bottom' }}>
    <Stack hasGutter>
      {submitError && (
        <RegisterModelErrors
          submitLabel={submitLabel}
          submitError={submitError}
          errorName={errorName}
          versionName={versionName}
          modelName={modelName}
        />
      )}
      <StackItem>
        <ActionGroup>
          <Button
            isDisabled={isSubmitDisabled}
            variant="primary"
            id="create-button"
            data-testid="create-button"
            isLoading={isSubmitting}
            onClick={onSubmit}
          >
            {submitLabel}
          </Button>
          <Button isDisabled={isSubmitting} variant="link" id="cancel-button" onClick={onCancel}>
            Cancel
          </Button>
        </ActionGroup>
      </StackItem>
    </Stack>
  </PageSection>
);

export default RegistrationFormFooter;
