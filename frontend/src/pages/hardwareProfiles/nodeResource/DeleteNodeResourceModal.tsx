import * as React from 'react';
import { Alert, Stack, StackItem } from '@patternfly/react-core';
import { Identifier } from '~/types';
import DeleteModal from '~/pages/projects/components/DeleteModal';

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

  // todo: figure out how to use the 'deleting' status; set to false for now! TODO
  return (
    <DeleteModal
      title={deleteTitle}
      onClose={onBeforeClose}
      onDelete={() => {
        onBeforeClose(true);
      }}
      deleting={false}
      submitButtonLabel="Delete"
      deleteName={identifier.displayName}
      testId="delete-node-resource-modal"
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
            Are you sure you want to delete the resource: <strong>{identifier.displayName}</strong>?
          </p>
        </StackItem>
      </Stack>
    </DeleteModal>
  );
};

export default DeleteNodeResourceModal;
