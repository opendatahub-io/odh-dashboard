import * as React from 'react';
import { Alert } from '@patternfly/react-core';
import { APIKey } from '~/app/types/api-key';
import DeleteModal from '~/app/shared/DeleteModal';
import useDeleteApiKey from '~/app/hooks/useDeleteApiKey';

type DeleteApiKeyModalProps = {
  apiKey: APIKey;
  onClose: (deleted?: boolean) => void;
};

const DeleteApiKeyModal: React.FC<DeleteApiKeyModalProps> = ({ apiKey, onClose }) => {
  const { isDeleting, error, deleteApiKeyCallback } = useDeleteApiKey();

  const handleDelete = React.useCallback(async () => {
    if (!apiKey.id) {
      throw new Error('Cannot revoke API key: API key name is undefined');
    }
    try {
      await deleteApiKeyCallback(apiKey.id);
      onClose(true);
    } catch {
      // Error is handled by the hook and displayed in the modal
    }
  }, [deleteApiKeyCallback, apiKey.id, onClose]);

  if (!apiKey.id) {
    return null;
  }

  return (
    <DeleteModal
      title="Revoke API key?"
      onClose={() => {
        onClose();
      }}
      deleting={isDeleting}
      onDelete={handleDelete}
      submitButtonLabel="Revoke"
      deleteName={apiKey.name}
      error={error}
      genericLabel
    >
      <Alert title="This action is permanent and cannot be undone" variant="warning">
        Revoking this API key will immediately and permanently invalidate it. Any applications or
        services currently using this key will lose access.
      </Alert>
      <br />
      Are you sure you want to revoke the API Key <strong>{apiKey.name}</strong>?
      <br />
      <br />
      The key will remain visible with an Expired status but can no longer be used for
      authentication.
    </DeleteModal>
  );
};

export default DeleteApiKeyModal;
