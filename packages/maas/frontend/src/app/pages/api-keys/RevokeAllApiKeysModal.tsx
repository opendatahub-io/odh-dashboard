import * as React from 'react';
import {
  Alert,
  Button,
  Flex,
  FlexItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Stack,
  StackItem,
  TextInput,
} from '@patternfly/react-core';
import { deleteAllApiKeys } from '~/app/api/api-keys';

type RevokeAllApiKeysModalProps = {
  onClose: (revoked: boolean) => void;
  apiKeyCount: number;
};

const RevokeAllApiKeysModal: React.FC<RevokeAllApiKeysModalProps> = ({ onClose, apiKeyCount }) => {
  const [revoking, setRevoking] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();
  const [value, setValue] = React.useState('');

  const confirmationWord = 'revoke';
  const isConfirmed = value.trim() === confirmationWord;

  const handleRevoke = React.useCallback(async () => {
    setRevoking(true);
    setError(undefined);

    try {
      await deleteAllApiKeys()({});
      onClose(true);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to revoke API keys'));
      setRevoking(false);
    }
  }, [onClose]);

  const onBeforeClose = (revoked: boolean) => {
    if (revoked) {
      handleRevoke();
    } else {
      onClose(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={() => onBeforeClose(false)}
      variant="small"
      data-testid="revoke-all-api-keys-modal"
    >
      <ModalHeader title="Revoke all API keys?" titleIconVariant="warning" />
      <ModalBody>
        <Stack hasGutter>
          <StackItem>
            This action cannot be undone. Revoking all API keys will immediately remove endpoint
            access to any applications currently using them. This will revoke {apiKeyCount}{' '}
            {apiKeyCount === 1 ? 'key' : 'keys'}.
          </StackItem>

          <StackItem>
            <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
              <FlexItem>
                Type <strong>{confirmationWord}</strong> to confirm:
              </FlexItem>

              <TextInput
                id="revoke-confirmation-input"
                data-testid="revoke-confirmation-input"
                aria-label="Revoke confirmation input"
                value={value}
                onChange={(_e, newValue) => setValue(newValue)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && isConfirmed && !revoking) {
                    handleRevoke();
                  }
                }}
              />
            </Flex>
          </StackItem>

          {error && (
            <StackItem>
              <Alert
                data-testid="revoke-all-error-alert"
                title="Error revoking API keys"
                isInline
                variant="danger"
              >
                {error.message}
              </Alert>
            </StackItem>
          )}
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button
          key="revoke-button"
          variant="danger"
          isLoading={revoking}
          isDisabled={revoking || !isConfirmed}
          onClick={() => onBeforeClose(true)}
          data-testid="revoke-keys-button"
        >
          Revoke keys
        </Button>
        <Button
          key="cancel-button"
          variant="link"
          onClick={() => onBeforeClose(false)}
          data-testid="cancel-revoke-button"
        >
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default RevokeAllApiKeysModal;
