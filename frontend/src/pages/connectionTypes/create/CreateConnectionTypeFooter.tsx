import * as React from 'react';
import {
  ActionList,
  ActionListItem,
  Alert,
  Button,
  Stack,
  StackItem,
} from '@patternfly/react-core';

type CreateConnectionTypeFooterProps = {
  onSave: () => void;
  onCancel: () => void;
  createDisable: boolean;
  errorMessage?: string;
};

export const CreateConnectionTypeFooter: React.FC<CreateConnectionTypeFooterProps> = ({
  onSave,
  onCancel,
  createDisable,
  errorMessage,
}) => (
  <Stack hasGutter>
    {errorMessage && (
      <StackItem>
        <Alert isInline variant="danger" title="Error creating connection type">
          {errorMessage}
        </Alert>
      </StackItem>
    )}
    <StackItem>
      <ActionList>
        <ActionListItem>
          <Button
            isDisabled={createDisable}
            variant="primary"
            data-testid="submit-button"
            onClick={onSave}
          >
            Create
          </Button>
        </ActionListItem>
        <ActionListItem>
          <Button variant="link" onClick={onCancel}>
            Cancel
          </Button>
        </ActionListItem>
      </ActionList>
    </StackItem>
  </Stack>
);
