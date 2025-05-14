import * as React from 'react';
import {
  Alert,
  Button,
  Stack,
  StackItem,
  Modal,
  ModalHeader,
  ModalBody,
  ModalFooter,
} from '@patternfly/react-core';
import { Identifier } from '~/types';
import { CPU_MEMORY_MISSING_WARNING } from '~/pages/hardwareProfiles/const';

type DeleteNodeResourceModalProps = {
  identifier: Identifier;
  onClose: (deleted: boolean) => void;
};

const DeleteNodeResourceModal: React.FC<DeleteNodeResourceModalProps> = ({
  identifier,
  onClose,
}) => {
  const onBeforeClose = (shouldDoDeletion: boolean) => {
    onClose(shouldDoDeletion);
  };

  const deleteTitle = `Delete resource: ${identifier.displayName}`;

  return (
    <Modal
      isOpen
      data-testid="delete-node-resource-modal"
      variant="small"
      onClose={() => onBeforeClose(false)}
    >
      <ModalHeader title={deleteTitle} />
      <ModalBody>
        <Stack hasGutter>
          <StackItem>
            <Alert variant="warning" isInline title="Removing the last CPU or Memory resource">
              {CPU_MEMORY_MISSING_WARNING}
            </Alert>
          </StackItem>
          <StackItem>
            <p>
              The resource: <strong>{identifier.displayName}</strong> will be deleted.
            </p>
          </StackItem>
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button
          key="delete-button"
          data-testid="delete-node-resource-modal-delete-btn"
          onClick={() => onBeforeClose(true)}
        >
          Delete
        </Button>
        <Button
          key="cancel-button"
          data-testid="delete-node-resource-modal-cancel-btn"
          variant="link"
          onClick={() => onBeforeClose(false)}
        >
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default DeleteNodeResourceModal;
