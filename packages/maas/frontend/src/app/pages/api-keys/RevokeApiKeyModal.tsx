import * as React from 'react';
import { Alert, Stack, StackItem } from '@patternfly/react-core';
import { APIKey } from '~/app/types/api-key';
import DeleteModal from '~/app/shared/DeleteModal';
import useRevokeApiKey from '~/app/hooks/useRevokeApiKey';

type RevokeApiKeyModalProps = {
  apiKey: APIKey;
  onClose: (deleted?: boolean) => void;
};

const RevokeApiKeyModal: React.FC<RevokeApiKeyModalProps> = ({ apiKey, onClose }) => {
  const { isRevoking, error, revokeApiKeyCallback } = useRevokeApiKey();

  const handleRevoke = React.useCallback(async () => {
    if (!apiKey.id) {
      throw new Error('Cannot revoke API key: API key name is undefined');
    }
    try {
      await revokeApiKeyCallback(apiKey.id);
      onClose(true);
    } catch {
      // Error is handled by the hook and displayed in the modal
    }
  }, [revokeApiKeyCallback, apiKey.id, onClose]);

  if (!apiKey.id) {
    return null;
  }

  return (
    <DeleteModal
      title="Revoke API key?"
      onClose={() => {
        onClose();
      }}
      deleting={isRevoking}
      onDelete={handleRevoke}
      submitButtonLabel="Revoke"
      deleteName={apiKey.name}
      error={error}
      genericLabel
      data-testid="revoke-api-key-modal"
    >
      <Stack hasGutter>
        <StackItem>
          <Alert title="This action is permanent and cannot be undone" variant="warning">
            Revoking this API key will immediately and permanently invalidate it. Any applications
            or services currently using this key will lose access.
          </Alert>
        </StackItem>
        <StackItem>
          Are you sure you want to revoke the API Key <strong>{apiKey.name}</strong>?
        </StackItem>
        <StackItem>
          The key will remain visible with an Expired status but can no longer be used for
          authentication.
        </StackItem>
      </Stack>
    </DeleteModal>
  );
};

export default RevokeApiKeyModal;
