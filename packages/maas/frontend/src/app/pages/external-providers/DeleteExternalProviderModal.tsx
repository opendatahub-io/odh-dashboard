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
      title="Delete provider?"
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
      genericLabel={false}
      testId="delete-external-provider-modal"
    >
      <Stack hasGutter>
        <StackItem data-testid="delete-modal-confirmation-message">
          The <strong>{externalProvider.displayName || externalProvider.name}</strong> provider will
          be deleted. Any external models that reference it will lose their endpoint configuration
          and be unavailable until they are assigned a new provider.
        </StackItem>
      </Stack>
    </DeleteModal>
  );
};

export default DeleteExternalProviderModal;
