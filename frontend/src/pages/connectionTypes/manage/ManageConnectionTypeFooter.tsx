import * as React from 'react';
import {
  ActionList,
  ActionListItem,
  Alert,
  Button,
  Stack,
  StackItem,
} from '@patternfly/react-core';

type Props = {
  onSave: () => Promise<void>;
  onCancel: () => void;
  isSaveDisabled: boolean;
  saveButtonLabel?: string;
};

const ManageConnectionTypeFooter: React.FC<Props> = ({
  onSave,
  onCancel,
  isSaveDisabled,
  saveButtonLabel = 'Create',
}) => {
  const [isSaving, setIsSaving] = React.useState(false);
  const [error, setError] = React.useState<string>();
  return (
    <Stack hasGutter>
      {error && (
        <StackItem>
          <Alert
            isInline
            variant="danger"
            title="Error saving connection type"
            data-testid="connection-type-footer-error"
          >
            {error}
          </Alert>
        </StackItem>
      )}
      <StackItem>
        <ActionList>
          <ActionListItem>
            <Button
              isDisabled={isSaveDisabled || isSaving}
              variant="primary"
              data-testid="submit-button"
              onClick={() => {
                setError(undefined);
                setIsSaving(true);
                onSave()
                  .catch((e) => {
                    setError(e instanceof Error ? e.message : 'Error saving connection type');
                  })
                  .finally(() => {
                    setIsSaving(false);
                  });
              }}
              isLoading={isSaving}
            >
              {saveButtonLabel}
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
};

export default ManageConnectionTypeFooter;
