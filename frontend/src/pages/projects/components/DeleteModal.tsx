import * as React from 'react';
import { Alert, Button, Modal, Stack, StackItem, TextInput } from '@patternfly/react-core';

type DeleteModalProps = {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  deleting: boolean;
  onDelete: () => void;
  deleteName: string;
  error?: Error;
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
}) => {
  const [value, setValue] = React.useState('');
  return (
    <Modal
      title={title}
      titleIconVariant="warning"
      isOpen={isOpen}
      onClose={onClose}
      actions={[
        <Button
          key="delete-button"
          variant="danger"
          isDisabled={deleting || value !== deleteName}
          onClick={onDelete}
        >
          Delete
        </Button>,
        <Button key="cancel-button" variant="secondary" onClick={onClose}>
          Cancel
        </Button>,
      ]}
      variant="small"
    >
      <Stack hasGutter>
        <StackItem>{children}</StackItem>
        <StackItem>
          Confirm deletion by typing <strong>{deleteName}</strong> below:
        </StackItem>
        <StackItem>
          <TextInput
            id="delete-modal-input"
            value={value}
            onChange={(newValue) => setValue(newValue)}
          />
        </StackItem>
        {error && (
          <StackItem>
            <Alert title={`Error deleting ${deleteName}`} isInline variant="danger">
              {error.message}
            </Alert>
          </StackItem>
        )}
      </Stack>
    </Modal>
  );
};

export default DeleteModal;
