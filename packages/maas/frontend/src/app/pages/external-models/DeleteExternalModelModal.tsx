import * as React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import DeleteModal from '~/app/shared/DeleteModal';
import { useDeleteExternalModel } from '~/app/hooks/useDeleteExternalModel';
import { ExternalModel } from '~/app/types/external-models';

type DeleteExternalModelModalProps = {
  externalModel: ExternalModel;
  onClose: (deleted?: boolean) => void;
};

const DeleteExternalModelModal: React.FC<DeleteExternalModelModalProps> = ({
  externalModel,
  onClose,
}) => {
  const { isDeleting, error, deleteExternalModelCallback } = useDeleteExternalModel(
    externalModel.namespace,
  );
  if (!externalModel.name) {
    return null;
  }

  return (
    <DeleteModal
      title="Delete external model?"
      onClose={() => {
        onClose();
      }}
      deleting={isDeleting}
      onDelete={async () => {
        await deleteExternalModelCallback(externalModel.name);
        onClose(true);
      }}
      submitButtonLabel="Delete"
      deleteName={externalModel.displayName || externalModel.name}
      error={error}
      genericLabel
      testId="delete-external-model-modal"
    >
      <Stack hasGutter>
        <StackItem data-testid="delete-modal-confirmation-message">
          The <strong>{externalModel.displayName || externalModel.name}</strong> external model and
          its corresponding Model Ref will be permanently deleted. Any subscriptions or
          authorization policies referencing this model will lose access. This action cannot be
          undone.
        </StackItem>
      </Stack>
    </DeleteModal>
  );
};

export default DeleteExternalModelModal;
