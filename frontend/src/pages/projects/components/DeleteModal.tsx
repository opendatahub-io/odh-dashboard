import * as React from 'react';
import { Alert, Button, Modal, Stack, StackItem, TextInput } from '@patternfly/react-core';

type DeleteModalProps = {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  deleting: boolean;
  onDelete: () => void;
  deleteName: string;
  submitButtonLabel?: string;
  error?: Error;
  children: React.ReactNode;
  testId?: string;
};

const DeleteModal: React.FC<DeleteModalProps> = ({
  children,
  title,
  isOpen,
  onClose,
  deleting,
  onDelete,
  deleteName,
  error,
  submitButtonLabel = 'Delete',
  testId,
}) => {
  const [value, setValue] = React.useState('');

  const deleteNameSanitized = React.useMemo(
    () => deleteName.trim().replace(/\s+/g, ' '),
    [deleteName],
  );

  const onBeforeClose = (deleted: boolean) => {
    if (deleted) {
      onDelete();
    } else {
      onClose();
    }
  };

  React.useEffect(() => {
    if (!isOpen) {
      setValue('');
    }
  }, [isOpen]);

  return (
    <Modal
      title={title}
      titleIconVariant="warning"
      isOpen={isOpen}
      onClose={() => onBeforeClose(false)}
      actions={[
        <Button
          key="delete-button"
          variant="danger"
          isLoading={deleting}
          isDisabled={deleting || value !== deleteNameSanitized}
          onClick={() => onBeforeClose(true)}
        >
          {submitButtonLabel}
        </Button>,
        <Button key="cancel-button" variant="secondary" onClick={() => onBeforeClose(false)}>
          Cancel
        </Button>,
      ]}
      variant="small"
      data-testid={testId}
    >
      <Stack hasGutter>
        <StackItem>{children}</StackItem>
        <StackItem>
          Type <strong>{deleteNameSanitized}</strong> to confirm deletion.
        </StackItem>
        <StackItem>
          <TextInput
            id="delete-modal-input"
            aria-label="Delete modal input"
            value={value}
            onChange={(e, newValue) => setValue(newValue)}
            onKeyDown={(event) => {
              if (event.key === 'Enter' && value === deleteNameSanitized && !deleting) {
                onDelete();
              }
            }}
          />
        </StackItem>
        {error && (
          <StackItem>
            <Alert title={`Error deleting ${deleteNameSanitized}`} isInline variant="danger">
              {error.message}
            </Alert>
          </StackItem>
        )}
      </Stack>
    </Modal>
  );
};

export default DeleteModal;
