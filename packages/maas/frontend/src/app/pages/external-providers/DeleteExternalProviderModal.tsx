import * as React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import DeleteModal from '~/app/shared/DeleteModal';
import { useDeleteExternalProvider } from '~/app/hooks/useDeleteExternalProvider';
import { ExternalProvider } from '~/app/types/external-models';

type DeleteExternalProviderModalProps = {
  externalProvider: ExternalProvider;
  onClose: (deleted?: boolean) => void;
};

const DeleteExternalProviderModal: React.FC<DeleteExternalProviderModalProps> = ({
  externalProvider,
  onClose,
}) => {
  const { isDeleting, error, deleteExternalProviderCallback } = useDeleteExternalProvider(
    externalProvider.namespace,
  );
  if (!externalProvider.name) {
    return null;
  }

  return (
    <DeleteModal
      title="Delete external provider?"
      onClose={() => {
        onClose();
      }}
      deleting={isDeleting}
      onDelete={async () => {
        try {
          await deleteExternalProviderCallback(externalProvider.name);
          onClose(true);
        } catch {
          // Error already surfaced via the `error` prop from useDeleteExternalProvider.
          // Keep the modal open so the user can see and dismiss the error.
        }
      }}
      submitButtonLabel="Delete"
      deleteName={externalProvider.displayName || externalProvider.name}
      error={error}
      genericLabel
      testId="delete-external-provider-modal"
    >
      <Stack hasGutter>
        <StackItem data-testid="delete-modal-confirmation-message">
          The <strong>{externalProvider.displayName || externalProvider.name}</strong> external
          provider will be permanently deleted. This action cannot be undone.
          <br />
          <br />
          Any external models that reference this provider will lose their endpoint configuration
          and their status will change to <strong>Unavailable</strong>. You will need to update
          those models with a different provider or recreate this one.
          <br />
          <br />
          After deleting, navigate to <strong>External models</strong> to review and update any
          affected models.
        </StackItem>
      </Stack>
    </DeleteModal>
  );
};

export default DeleteExternalProviderModal;
