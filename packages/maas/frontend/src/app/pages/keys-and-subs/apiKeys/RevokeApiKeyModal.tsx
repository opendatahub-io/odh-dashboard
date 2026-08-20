import * as React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import { TrackingOutcome } from '@odh-dashboard/ui-core';
import { fireFormTrackingEvent } from '@odh-dashboard/internal/concepts/analyticsTracking/segmentIOUtils';
import { APIKey } from '~/app/types/api-key';
import DeleteModal from '~/app/shared/DeleteModal';
import useRevokeApiKey from '~/app/hooks/useRevokeApiKey';
import {
  ApiKeyRevokeInitiatedFrom,
  ApiKeyRevokedProperties,
  MaaSEvents,
} from '~/app/types/event-tracking';

type RevokeApiKeyModalProps = {
  apiKey: APIKey;
  onClose: (deleted?: boolean) => void;
  initiatedFrom: ApiKeyRevokeInitiatedFrom;
};

const RevokeApiKeyModal: React.FC<RevokeApiKeyModalProps> = ({
  apiKey,
  onClose,
  initiatedFrom,
}) => {
  const { isRevoking, error, revokeApiKeyCallback } = useRevokeApiKey();

  const handleClose = React.useCallback(
    (deleted?: boolean) => {
      if (!deleted) {
        fireFormTrackingEvent(MaaSEvents.API_KEY_REVOKED, {
          outcome: TrackingOutcome.cancel,
          initiatedFrom,
        } satisfies ApiKeyRevokedProperties);
      }
      onClose(deleted);
    },
    [initiatedFrom, onClose],
  );

  const handleRevoke = React.useCallback(async () => {
    if (!apiKey.id) {
      throw new Error('Cannot revoke API key: API key name is undefined');
    }
    try {
      await revokeApiKeyCallback(apiKey.id);
      fireFormTrackingEvent(MaaSEvents.API_KEY_REVOKED, {
        outcome: TrackingOutcome.submit,
        success: true,
        initiatedFrom,
      } satisfies ApiKeyRevokedProperties);
      onClose(true);
    } catch (err) {
      fireFormTrackingEvent(MaaSEvents.API_KEY_REVOKED, {
        outcome: TrackingOutcome.submit,
        success: false,
        error: err instanceof Error ? err.message : 'Failed to revoke API key',
        initiatedFrom,
      } satisfies ApiKeyRevokedProperties);
      // Error is handled by the hook and displayed in the modal
    }
  }, [revokeApiKeyCallback, apiKey.id, onClose, initiatedFrom]);

  if (!apiKey.id) {
    return null;
  }

  return (
    <DeleteModal
      title="Revoke API key?"
      onClose={() => {
        handleClose();
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
