import * as React from 'react';
import { ActionList, ActionListItem, Button, Stack, StackItem } from '@patternfly/react-core';

type CreateConnectionTypeFooterProps = {
  onSave: () => void;
  onCancel: () => void;
  createDisable: boolean;
};

export const CreateConnectionTypeFooter: React.FC<CreateConnectionTypeFooterProps> = ({
  onSave,
  onCancel,
  createDisable,
}) => (
  <Stack>
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
