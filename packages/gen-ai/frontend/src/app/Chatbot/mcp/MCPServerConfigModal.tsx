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
  Alert,
  InputGroup,
  InputGroupItem,
} from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons';
import { FieldGroupHelpLabelIcon } from 'mod-arch-shared';
import { MCPServer } from '~/app/types';

interface MCPServerConfigModalProps {
  isOpen: boolean;
  onClose: () => void;
  server: MCPServer;
  currentToken?: string;
  onTokenSave: (serverUrl: string, token: string) => Promise<{ success: boolean; error?: string }>;
  isValidating?: boolean;
  validationError?: string;
}

const MCPServerConfigModal: React.FC<MCPServerConfigModalProps> = ({
  isOpen,
  onClose,
  server,
  currentToken = '',
  onTokenSave,
  isValidating = false,
  validationError,
}) => {
  const [accessToken, setAccessToken] = React.useState(currentToken);
  const [hasAttemptedValidation, setHasAttemptedValidation] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) {
      setAccessToken(currentToken);
      setHasAttemptedValidation(false);
    }
  }, [isOpen, currentToken]);

  React.useEffect(() => {
    if (validationError) {
      // eslint-disable-next-line no-console
      console.error('MCP Server validation error:', validationError);
    }
  }, [validationError]);

  const handleSave = React.useCallback(async () => {
    if (!accessToken.trim()) {
      return;
    }

    setHasAttemptedValidation(true);
    await onTokenSave(server.connectionUrl, accessToken.trim());
    // Parent component handles modal transitions on success/error
  }, [server.connectionUrl, accessToken, onTokenSave]);

  const handleClear = React.useCallback(() => {
    setAccessToken('');
  }, []);

  return (
    <Modal
      variant={ModalVariant.small}
      isOpen={isOpen}
      onClose={onClose}
      data-testid="mcp-token-auth-modal"
    >
      <ModalHeader title="Authorize MCP server" />
      <ModalBody>
        <Form>
          <p>{`Enter the access token for the ${server.name} MCP Server.`}</p>
          {validationError && <Alert variant="danger" title="Authorization failed. Try again." />}
          <FormGroup
            label="Access token"
            isRequired
            fieldId="access-token"
            labelHelp={
              <FieldGroupHelpLabelIcon
                content={
                  <p>
                    Bearer token that will be passed in the Authorization header of the request to
                    the MCP Server.
                  </p>
                }
              />
            }
          >
            {hasAttemptedValidation || validationError ? (
              <InputGroup>
                <InputGroupItem isFill>
                  <TextInput
                    isRequired
                    type="password"
                    id="access-token"
                    name="access-token"
                    value={accessToken}
                    onChange={(_event, value) => setAccessToken(value)}
                    isDisabled={isValidating}
                    validated={validationError ? 'error' : 'default'}
                    data-testid="mcp-token-input"
                  />
                </InputGroupItem>
                <InputGroupItem isPlain>
                  <Button
                    variant="link"
                    onClick={handleClear}
                    isDisabled={isValidating}
                    aria-label="Clear token"
                    className="pf-v6-u-ml-sm"
                    data-testid="mcp-token-clear-button"
                  >
                    <TimesIcon /> Clear
                  </Button>
                </InputGroupItem>
              </InputGroup>
            ) : (
              <TextInput
                isRequired
                type="password"
                id="access-token"
                name="access-token"
                value={accessToken}
                onChange={(_event, value) => setAccessToken(value)}
                isDisabled={isValidating}
                data-testid="mcp-token-input"
              />
            )}
          </FormGroup>
        </Form>
      </ModalBody>
      <ModalFooter data-testid="modal-footer">
        <Button
          key="configure"
          variant="primary"
          onClick={handleSave}
          isDisabled={isValidating || !accessToken.trim()}
          isLoading={isValidating}
          spinnerAriaValueText={isValidating ? 'Validating token...' : undefined}
          data-testid="mcp-token-authorize-button"
        >
          {isValidating ? 'Validating...' : 'Authorize'}
        </Button>
        <Button
          key="cancel"
          variant="link"
          onClick={onClose}
          className="pf-v6-u-mr-sm"
          isDisabled={isValidating}
          data-testid="mcp-token-cancel-button"
        >
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default MCPServerConfigModal;
