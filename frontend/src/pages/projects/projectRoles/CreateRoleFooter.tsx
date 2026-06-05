import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { ActionList, ActionListItem, Button } from '@patternfly/react-core';

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

  return (
    <ActionList>
      <ActionListItem>
        <Button isDisabled={isSubmitDisabled} variant="primary" data-testid="create-role-submit">
          {isEdit ? 'Save changes' : 'Create role'}
        </Button>
      </ActionListItem>
      <ActionListItem>
        <Button
          variant="link"
          data-testid="create-role-cancel"
          onClick={() => navigate(`/projects/${namespace}?section=roles`)}
        >
          Cancel
        </Button>
      </ActionListItem>
    </ActionList>
  );
};

export default CreateRoleFooter;
