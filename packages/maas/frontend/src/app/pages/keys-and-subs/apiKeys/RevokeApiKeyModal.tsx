import * as React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
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
          The <strong>{apiKey.name}</strong> API key will be revoked, and any applications or
          services currently using the key will lose access. The key will remain visible from within
          OpenShift AI, but can no longer be used for authentication.
        </StackItem>
      </Stack>
    </DeleteModal>
  );
};

export default RevokeApiKeyModal;
