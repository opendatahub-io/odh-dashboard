import * as React from 'react';
import { Alert, Button, Stack, StackItem } from '@patternfly/react-core';
import { Modal } from '@patternfly/react-core/deprecated';
import { Identifier } from '~/types';

type DeleteNodeResourceModalProps = {
  identifier: Identifier;
  onClose: (deleted: boolean) => void;
};

const DeleteNodeResourceModal: React.FC<DeleteNodeResourceModalProps> = ({
  identifier,
  onClose,
}) => {
  const onBeforeClose = (deleted = false) => {
    onClose(deleted);
  };

  const deleteTitle = `Delete resource: ${identifier.displayName}`;

  return (
    <Modal
      title={deleteTitle}
      onClose={() => onBeforeClose(false)}
      isOpen
      actions={[
        <Button key="delete-button" onClick={() => onBeforeClose(true)}>
          Delete
        </Button>,
        <Button key="cancel-button" variant="link" onClick={() => onBeforeClose(false)}>
          Cancel
        </Button>,
      ]}
      variant="small"
      data-testid="delete-node-resource-modal"
    >
      <Stack hasGutter>
        <StackItem>
          <Alert variant="warning" isInline title="Removing the last CPU or Memory resource">
            It is not recommended to remove the last CPU or Memory resource. Resources that use this
            hardware profile will schedule, but will be very unstable due to not having any lower or
            upper resource bounds.
          </Alert>
        </StackItem>
        <StackItem>
          <p>
            The resource: <strong>{identifier.displayName}</strong> will be deleted.
          </p>
        </StackItem>
      </Stack>
    </Modal>
  );
};

export default DeleteNodeResourceModal;
