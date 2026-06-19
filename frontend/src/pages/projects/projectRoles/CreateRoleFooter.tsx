import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ActionList,
  ActionListItem,
  Alert,
  Button,
  Stack,
  StackItem,
} from '@patternfly/react-core';

type CreateRoleFooterProps = {
  namespace: string;
  isSubmitDisabled: boolean;
  isEdit?: boolean;
  onSubmit: () => Promise<void>;
  submitError?: Error;
};

const CreateRoleFooter: React.FC<CreateRoleFooterProps> = ({
  namespace,
  isSubmitDisabled,
  isEdit = false,
  onSubmit,
  submitError,
}) => {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleSubmit = React.useCallback(async () => {
    setIsSubmitting(true);
    try {
      await onSubmit();
    } catch {
      // error is surfaced via submitError prop
    } finally {
      setIsSubmitting(false);
    }
  }, [onSubmit]);

  return (
    <Stack hasGutter>
      {submitError && (
        <StackItem>
          <Alert
            isInline
            variant="danger"
            title={isEdit ? 'Error updating role' : 'Error creating role'}
            data-testid="create-role-error-alert"
          >
            {submitError.message}
          </Alert>
        </StackItem>
      )}
      <StackItem>
        <ActionList>
          <ActionListItem>
            <Button
              isDisabled={isSubmitDisabled || isSubmitting}
              isLoading={isSubmitting}
              variant="primary"
              data-testid="create-role-submit"
              onClick={handleSubmit}
            >
              {isEdit ? 'Save changes' : 'Create role'}
            </Button>
          </ActionListItem>
          <ActionListItem>
            <Button
              variant="link"
              data-testid="create-role-cancel"
              isDisabled={isSubmitting}
              onClick={() => navigate(`/projects/${namespace}?section=roles`)}
            >
              Cancel
            </Button>
          </ActionListItem>
        </ActionList>
      </StackItem>
    </Stack>
  );
};

export default CreateRoleFooter;
