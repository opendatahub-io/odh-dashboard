import * as React from 'react';
import { Alert, Stack, StackItem } from '@patternfly/react-core';
import { Identifier } from '#~/types';
import { CPU_MEMORY_MISSING_WARNING } from '#~/pages/hardwareProfiles/const';
import ContentModal, { ButtonAction } from '#~/components/modals/ContentModal';

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

  const buttonActions: ButtonAction[] = [
    {
      label: 'Delete',
      onClick: () => onBeforeClose(true),
      variant: 'primary',
      dataTestId: 'delete-node-resource-modal-delete-btn',
    },
    {
      label: 'Cancel',
      onClick: () => onBeforeClose(false),
      variant: 'link',
      dataTestId: 'delete-node-resource-modal-cancel-btn',
    },
  ];

  const contents = (
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
  );

  return (
    <ContentModal
      onClose={() => onBeforeClose(false)}
      title={deleteTitle}
      contents={contents}
      buttonActions={buttonActions}
      dataTestId="delete-node-resource-modal"
      variant="small"
    />
  );
};

export default DeleteNodeResourceModal;
