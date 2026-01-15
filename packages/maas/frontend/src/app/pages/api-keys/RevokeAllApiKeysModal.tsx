import * as React from 'react';
import {
  Alert,
  Button,
  Flex,
  FlexItem,
  Form,
  FormGroup,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Stack,
  StackItem,
  TextInput,
} from '@patternfly/react-core';

type RevokeAllApiKeysModalProps = {
  onClose: (revoked: boolean) => void;
  apiKeyCount: number;
};

const RevokeAllApiKeysModal: React.FC<RevokeAllApiKeysModalProps> = ({ onClose, apiKeyCount }) => {
  const [revoking, setRevoking] = React.useState(false);
  const [error, setError] = React.useState<Error | undefined>();
  const [confirmationValue, setConfirmationValue] = React.useState('');

  const isConfirmed = confirmationValue.trim() === 'revoke';

  const onBeforeClose = (revoked: boolean) => {
    onClose(revoked);
    setRevoking(false);
    setError(undefined);
    setConfirmationValue('');
  };

  const handleRevoke = () => {
    setRevoking(true);

    setTimeout(() => {
      onBeforeClose(true);
    }, 500);
  };

  return (
    <Modal
      isOpen
      onClose={() => onBeforeClose(false)}
      variant="small"
      data-testid="revoke-all-api-keys-modal"
    >
      <ModalHeader title="Revoke all API keys?" />
      <ModalBody>
        <Stack hasGutter>
          <StackItem>
            <Alert
              isInline
              variant="danger"
              title="This action cannot be undone"
              data-testid="revoke-all-alert"
            >
              Revoking all API keys will immediately remove endpoint access to any applications
              currently using them. This will revoke {apiKeyCount}{' '}
              {apiKeyCount === 1 ? 'key' : 'keys'}.
            </Alert>
          </StackItem>

          <StackItem>
            <Form>
              <FlexItem>
                To confirm revocation, type <strong>revoke</strong> below:
              </FlexItem>
              <FormGroup label="Confirmation" isRequired fieldId="revoke-confirmation-input">
                <Flex direction={{ default: 'column' }} spaceItems={{ default: 'spaceItemsSm' }}>
                  <TextInput
                    id="revoke-confirmation-input"
                    data-testid="revoke-confirmation-input"
                    aria-label="Revoke confirmation input"
                    placeholder="Type 'revoke' to confirm"
                    value={confirmationValue}
                    onChange={(_e, value) => setConfirmationValue(value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && isConfirmed && !revoking) {
                        handleRevoke();
                      }
                    }}
                  />
                </Flex>
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
          variant="primary"
          onClick={handleRevoke}
          isDisabled={!isConfirmed || revoking}
          isLoading={revoking}
          data-testid="revoke-keys-button"
        >
          Revoke keys
        </Button>
        <Button
          variant="link"
          onClick={() => onBeforeClose(false)}
          isDisabled={revoking}
          data-testid="cancel-revoke-button"
        >
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default RevokeAllApiKeysModal;
