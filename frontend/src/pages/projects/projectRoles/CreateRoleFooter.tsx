import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ActionList, ActionListItem, Button, Stack, StackItem } from '@patternfly/react-core';

type CreateRoleFooterProps = {
  namespace: string;
  isSubmitDisabled: boolean;
  isEdit?: boolean;
};

const CreateRoleFooter: React.FC<CreateRoleFooterProps> = ({
  namespace,
  isSubmitDisabled,
  isEdit = false,
}) => {
  const navigate = useNavigate();

  const handleCancel = React.useCallback(() => {
    navigate(`/projects/${namespace}?section=roles`);
  }, [navigate, namespace]);

  return (
    <Stack hasGutter>
      <StackItem>
        <ActionList>
          <ActionListItem>
            <Button
              isDisabled={isSubmitDisabled}
              variant="primary"
              data-testid="create-role-submit"
            >
              {isEdit ? 'Save changes' : 'Create role'}
            </Button>
          </ActionListItem>
          <ActionListItem>
            <Button variant="link" data-testid="create-role-cancel" onClick={handleCancel}>
              Cancel
            </Button>
          </ActionListItem>
        </ActionList>
      </StackItem>
    </Stack>
  );
};

export default CreateRoleFooter;
