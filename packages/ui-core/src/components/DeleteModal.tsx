import * as React from 'react';
import { Alert, Flex, FlexItem, Stack, StackItem, TextInput } from '@patternfly/react-core';
import ContentModal, { type ButtonAction } from './ContentModal';

type DeleteModalProps = {
  title: string;
  onClose: () => void;
  deleting: boolean;
  onDelete: () => void;
  deleteName: string;
  submitButtonLabel?: string;
  error?: Error;
  children: React.ReactNode;
  testId?: string;
  typeConfirmationLabel?: string;
  removeConfirmation?: boolean;
};

const DeleteModal: React.FC<DeleteModalProps> = ({
  children,
  title,
  onClose,
  deleting,
  onDelete,
  deleteName,
  error,
  submitButtonLabel = 'Delete',
  testId,
  typeConfirmationLabel = 'deletion',
  removeConfirmation = false,
}) => {
  const [value, setValue] = React.useState('');

  const deleteNameSanitized = React.useMemo(
    () => deleteName.trim().replaceAll(/\s+/g, ' '),
    [deleteName],
  );

  const canDelete = removeConfirmation || value.trim() === deleteNameSanitized;

  const buttonActions: ButtonAction[] = [
    {
      label: submitButtonLabel,
      onClick: onDelete,
      variant: 'danger',
      isLoading: deleting,
      isDisabled: deleting || !canDelete,
      dataTestId: 'delete-button',
    },
    {
      label: 'Cancel',
      onClick: onClose,
      variant: 'link',
      dataTestId: 'cancel-button',
    },
  ];

  const contents = (
    <Stack hasGutter>
      <StackItem>{children}</StackItem>

      {!removeConfirmation && (
        <StackItem>
          <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
            <FlexItem>
              Type <strong>{deleteNameSanitized}</strong> to confirm {typeConfirmationLabel}:
            </FlexItem>

            <TextInput
              id="delete-modal-input"
              data-testid="delete-modal-input"
              aria-label="Delete modal input"
              value={value}
              onChange={(_e, newValue) => setValue(newValue)}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && canDelete && !deleting) {
                  onDelete();
                }
              }}
            />
          </Flex>
        </StackItem>
      )}

      {error && (
        <StackItem>
          <Alert
            data-testid="delete-model-error-message-alert"
            title={`Error deleting ${deleteNameSanitized}`}
            isInline
            variant="danger"
          >
            {error.message}
          </Alert>
        </StackItem>
      )}
    </Stack>
  );

  return (
    <ContentModal
      onClose={onClose}
      title={title}
      titleIconVariant="warning"
      contents={contents}
      buttonActions={buttonActions}
      variant="small"
      dataTestId={testId || 'delete-modal'}
    />
  );
};

export default DeleteModal;
