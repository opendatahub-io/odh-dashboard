import * as React from 'react';
import {
  Modal,
  ModalVariant,
  Button,
  Form,
  FormGroup,
  TextInput,
  ModalHeader,
  ModalBody,
  ModalFooter,
  HelperText,
  HelperTextItem,
  Alert,
} from '@patternfly/react-core';
import { MCPServer } from '~/app/types';

interface MCPServerConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  server: MCPServer;
  currentToken?: string;
  onTokenSave: (serverUrl: string, token: string) => Promise<{ success: boolean; error?: string }>;
  isValidating?: boolean;
  validationError?: string;
  isAlreadyConnected?: boolean;
}

const MCPServerConfigModal: React.FC<MCPServerConfigModalProps> = ({
  isOpen,
  onClose,
  server,
  currentToken = '',
  onTokenSave,
  isValidating = false,
  validationError,
  isAlreadyConnected = false,
}) => {
  const [accessToken, setAccessToken] = React.useState(currentToken);
  const [showError, setShowError] = React.useState(true);

  React.useEffect(() => {
    if (isOpen) {
      setAccessToken(currentToken);
      setShowError(true);
    }
  }, [isOpen, currentToken]);

  const handleSave = React.useCallback(async () => {
    if (!accessToken.trim()) {
      return;
    }

    const result = await onTokenSave(server.connectionUrl, accessToken.trim());
    if (result.success) {
      onClose();
    }
  }, [server.connectionUrl, accessToken, onTokenSave, onClose]);

  const handleClear = React.useCallback(() => {
    setAccessToken('');
  }, []);

  return (
    <Modal variant={ModalVariant.medium} isOpen={isOpen} onClose={onClose}>
      <ModalHeader title={`Configure ${server.name}`} />
      <ModalBody>
        {isAlreadyConnected ? (
          <Alert variant="success" title="Connection Successful">
            <p>
              This server doesn&apos;t require a token. You can use it directly in your
              conversations.
            </p>
          </Alert>
        ) : (
          <>
            {validationError && showError && (
              <Alert variant="danger" title="Token Validation Failed" className="pf-v6-u-mb-md">
                <p>
                  <strong>Error:</strong> {validationError}
                </p>
              </Alert>
            )}
            <Form>
              <FormGroup label="Access Token" isRequired fieldId="access-token">
                <TextInput
                  isRequired
                  type="password"
                  id="access-token"
                  name="access-token"
                  value={accessToken}
                  onChange={(_event, value) => setAccessToken(value)}
                  placeholder="Enter your access token"
                  isDisabled={isValidating}
                />
                <HelperText className="pf-v6-u-mt-xs">
                  <HelperTextItem>
                    The access token for authorizing this MCP server. This will be validated against
                    the server.
                  </HelperTextItem>
                </HelperText>
              </FormGroup>
            </Form>
          </>
        )}
      </ModalBody>
      <ModalFooter>
        {isAlreadyConnected ? (
          <div className="pf-v6-u-ml-auto">
            <Button key="close" variant="primary" onClick={onClose}>
              Close
            </Button>
          </div>
        ) : (
          <>
            <Button key="clear" variant="secondary" onClick={handleClear} isDisabled={isValidating}>
              Clear
            </Button>
            <div className="pf-v6-u-ml-auto">
              <Button
                key="cancel"
                variant="link"
                onClick={onClose}
                className="pf-v6-u-mr-sm"
                isDisabled={isValidating}
              >
                Cancel
              </Button>
              <Button
                key="configure"
                variant="primary"
                onClick={handleSave}
                isDisabled={isValidating || !accessToken.trim()}
                isLoading={isValidating}
                spinnerAriaValueText={isValidating ? 'Validating token...' : undefined}
              >
                {isValidating ? 'Validating...' : 'Configure'}
              </Button>
            </div>
          </>
        )}
      </ModalFooter>
    </Modal>
  );
};

export default MCPServerConfigModal;
