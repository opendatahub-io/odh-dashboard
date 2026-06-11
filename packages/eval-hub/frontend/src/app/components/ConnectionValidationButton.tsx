import * as React from 'react';
import { Button, HelperText, HelperTextItem, Stack, StackItem } from '@patternfly/react-core';
import { CheckCircleIcon, ExclamationTriangleIcon } from '@patternfly/react-icons';
import type { ConnectionValidationState } from '~/app/types';

type ConnectionValidationButtonProps = {
  connectionValidation: ConnectionValidationState;
  canVerify: boolean;
  onVerify: () => void;
  isValidating: boolean;
};

const ConnectionValidationButton: React.FC<ConnectionValidationButtonProps> = ({
  connectionValidation,
  canVerify,
  onVerify,
  isValidating,
}) => (
  <Stack hasGutter>
    <StackItem>
      <Button
        variant="secondary"
        data-testid="validate-connection-button"
        onClick={onVerify}
        isDisabled={!canVerify}
        isLoading={isValidating}
      >
        {isValidating ? 'Validating...' : 'Validate connection'}
      </Button>
    </StackItem>
    {connectionValidation.status === 'success' ? (
      <StackItem>
        <HelperText>
          <HelperTextItem icon={<CheckCircleIcon />} variant="success">
            {connectionValidation.message}
          </HelperTextItem>
        </HelperText>
      </StackItem>
    ) : null}
    {connectionValidation.status === 'error' ? (
      <StackItem>
        <HelperText>
          <HelperTextItem icon={<ExclamationTriangleIcon />} variant="error">
            {connectionValidation.message}
          </HelperTextItem>
        </HelperText>
      </StackItem>
    ) : null}
  </Stack>
);

export default ConnectionValidationButton;
