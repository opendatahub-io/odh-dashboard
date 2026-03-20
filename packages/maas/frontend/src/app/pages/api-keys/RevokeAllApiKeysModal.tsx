import * as React from 'react';
import {
  Alert,
  Button,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Stack,
  StackItem,
  TextInput,
} from '@patternfly/react-core';
import { bulkRevokeApiKeys } from '~/app/api/api-keys';
import useUser from '~/app/hooks/useUser';

type RevokeAllApiKeysModalProps = {
  onClose: (revoked: boolean) => void;
};

const RevokeAllApiKeysModal: React.FC<RevokeAllApiKeysModalProps> = ({ onClose }) => {
  const { userId } = useUser();
  const [revoking, setRevoking] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();
  const [value, setValue] = React.useState('');

  const isConfirmed = value.trim() === userId;

  const handleRevoke = React.useCallback(async () => {
    setRevoking(true);
    setError(undefined);

    try {
      await bulkRevokeApiKeys()({}, userId);
      onClose(true);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to revoke API keys'));
      setRevoking(false);
    }
  }, [onClose, userId]);

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
      variant="medium"
      data-testid="revoke-all-api-keys-modal"
    >
      <ModalHeader title="Revoke all your active keys?" titleIconVariant="warning" />
      <ModalBody>
        <Stack hasGutter>
          <StackItem>
            All of your active API keys will be permanently invalidated. Applications or services
            using these keys will immediately lose access.
          </StackItem>

          <StackItem>
            Revoked keys will remain visible with a Revoked status but can no longer be used for
            authentication.
          </StackItem>

          <StackItem>
            <Form>
              <FormGroup
                label={<>Type &quot;{userId}&quot; to confirm</>}
                isRequired
                fieldId="revoke-confirmation-input"
              >
                <TextInput
                  id="revoke-confirmation-input"
                  data-testid="revoke-confirmation-input"
                  aria-label="Type your username to confirm"
                  value={value}
                  onChange={(_e, newValue) => setValue(newValue)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' && isConfirmed && !revoking) {
                      handleRevoke();
                    }
                  }}
                />
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>Type your username exactly to confirm</HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </FormGroup>
            </Form>
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
          Permanently revoke all keys
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
