import * as React from 'react';
import {
  ActionList,
  ActionListItem,
  Alert,
  Button,
  Stack,
  StackItem,
} from '@patternfly/react-core';

type DashboardModalFooterProps = {
  submitLabel: string;
  onSubmit: () => void;
  onCancel: () => void;
  isSubmitDisabled: boolean;
  isCancelDisabled?: boolean;
  isLoading?: boolean;
  alertTitle: string;
  error?: Error;
};

const DashboardModalFooter: React.FC<DashboardModalFooterProps> = ({
  submitLabel,
  onSubmit,
  onCancel,
  isSubmitDisabled,
  isCancelDisabled,
  isLoading,
  error,
  alertTitle,
}) => (
  // make sure alert uses the full width
  <Stack hasGutter style={{ flex: 'auto' }}>
    {error && (
      <StackItem>
        <Alert isInline variant="danger" title={alertTitle}>
          {error.message}
        </Alert>
      </StackItem>
    )}
    <StackItem>
      <ActionList>
        <ActionListItem>
          <Button
            key="submit"
            variant="primary"
            isDisabled={isSubmitDisabled}
            onClick={onSubmit}
            isLoading={isLoading}
          >
            {submitLabel}
          </Button>
        </ActionListItem>
        <ActionListItem>
          <Button key="cancel" variant="link" isDisabled={isCancelDisabled} onClick={onCancel}>
            Cancel
          </Button>
        </ActionListItem>
      </ActionList>
    </StackItem>
  </Stack>
);

export default DashboardModalFooter;
