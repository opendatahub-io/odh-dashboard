import * as React from 'react';
import {
  Alert,
  Button,
  capitalize,
  Form,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  InputGroup,
  InputGroupItem,
  Label,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Spinner,
  Stack,
  StackItem,
  TextInput,
  Title,
} from '@patternfly/react-core';
import { SearchIcon } from '@patternfly/react-icons';
import { Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { searchApiKeys, bulkRevokeApiKeys } from '~/app/api/api-keys';
import { useNotification } from '~/app/hooks/useNotification';
import type { APIKey } from '~/app/types/api-key';

const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

type AdminRevokeAllApiKeysModalProps = {
  onClose: (revoked: boolean) => void;
};

const AdminRevokeAllApiKeysModal: React.FC<AdminRevokeAllApiKeysModalProps> = ({ onClose }) => {
  const notification = useNotification();
  const [username, setUsername] = React.useState('');
  const [searchedUsername, setSearchedUsername] = React.useState('');
  const [apiKeys, setApiKeys] = React.useState<APIKey[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [searchError, setSearchError] = React.useState<Error | undefined>();
  const [revoking, setRevoking] = React.useState(false);
  const [revokeError, setRevokeError] = React.useState<Error | undefined>();
  const [hasSearched, setHasSearched] = React.useState(false);

  const activeKeys = apiKeys.filter((key) => key.status === 'active');

  const handleSearch = React.useCallback(async () => {
    const trimmed = username.trim();
    if (!trimmed) {
      return;
    }

    setSearching(true);
    setSearchError(undefined);
    setRevokeError(undefined);
    setSearchedUsername(trimmed);
    setHasSearched(true);

    try {
      const response = await searchApiKeys()({}, { filters: { username: trimmed } });
      setApiKeys(response.data);
    } catch (err) {
      setSearchError(err instanceof Error ? err : new Error('Failed to search API keys'));
      setApiKeys([]);
    } finally {
      setSearching(false);
    }
  }, [username]);

  const handleRevoke = React.useCallback(async () => {
    setRevoking(true);
    setRevokeError(undefined);

    try {
      await bulkRevokeApiKeys()({}, searchedUsername);
      notification.success(`All active keys for "${searchedUsername}" revoked`);
      onClose(true);
    } catch (err) {
      setRevokeError(err instanceof Error ? err : new Error('Failed to revoke API keys'));
      setRevoking(false);
    }
  }, [notification, onClose, searchedUsername]);

  return (
    <Modal
      isOpen
      onClose={() => onClose(false)}
      variant="medium"
      data-testid="admin-revoke-all-api-keys-modal"
      elementToFocus="#admin-revoke-username-input"
    >
      <ModalHeader title="Revoke user API keys?" titleIconVariant="warning" />
      <ModalBody>
        <Stack hasGutter>
          <StackItem>
            Type a username to view a user’s API keys. The user’s API keys will be revoked, and any
            applications or services currently using them will lose access. The keys will remain
            visible from within OpenShift AI, but can no longer be used for authentication.
          </StackItem>

          <StackItem>
            <Form
              onSubmit={(e) => {
                e.preventDefault();
                handleSearch();
              }}
            >
              <FormGroup label="Username" isRequired fieldId="admin-revoke-username-input">
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>
                      Type a username and click the search icon to view the user’s keys.
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
                <InputGroup>
                  <InputGroupItem isFill>
                    <TextInput
                      id="admin-revoke-username-input"
                      data-testid="admin-revoke-username-input"
                      aria-label="Enter username to search"
                      value={username}
                      onChange={(_e, val) => setUsername(val)}
                      placeholder="Type username"
                    />
                  </InputGroupItem>
                  <InputGroupItem>
                    <Button
                      variant="control"
                      aria-label="Search"
                      onClick={handleSearch}
                      isDisabled={!username.trim() || searching}
                      data-testid="admin-revoke-search-button"
                    >
                      <SearchIcon />
                    </Button>
                  </InputGroupItem>
                </InputGroup>
              </FormGroup>
            </Form>
          </StackItem>

          {searching && (
            <StackItem>
              <Spinner size="md" /> Searching...
            </StackItem>
          )}

          {searchError && (
            <StackItem>
              <Alert
                data-testid="admin-revoke-search-error"
                title="Error searching API keys"
                isInline
                variant="danger"
              >
                {searchError.message}
              </Alert>
            </StackItem>
          )}

          {!searching && hasSearched && !searchError && (
            <>
              {activeKeys.length === 0 ? (
                <StackItem>
                  <Alert
                    data-testid="admin-revoke-no-keys-alert"
                    title={`No active API keys found for "${searchedUsername}"`}
                    isInline
                    variant="info"
                  />
                </StackItem>
              ) : (
                <StackItem>
                  <Title headingLevel="h4" data-testid="admin-revoke-keys-found-alert">
                    <b>{searchedUsername}</b>’s API keys
                  </Title>
                  <Table aria-label="Active API keys" variant="compact">
                    <Thead>
                      <Tr>
                        <Th>Name</Th>
                        <Th>Status</Th>
                        <Th>Last used</Th>
                        <Th>Expiration</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {activeKeys.map((key) => (
                        <Tr key={key.id}>
                          <Td dataLabel="Name">{key.name}</Td>
                          <Td dataLabel="Status">
                            <Label color="green">{capitalize(key.status)}</Label>
                          </Td>
                          <Td dataLabel="Last used">
                            {key.lastUsedAt ? formatDate(key.lastUsedAt) : 'Never'}
                          </Td>
                          <Td dataLabel="Expiration">
                            {key.expirationDate ? formatDate(key.expirationDate) : 'Never'}
                          </Td>
                        </Tr>
                      ))}
                    </Tbody>
                  </Table>
                </StackItem>
              )}
            </>
          )}

          {revokeError && (
            <StackItem>
              <Alert
                data-testid="admin-revoke-error-alert"
                title="Error revoking API keys"
                isInline
                variant="danger"
              >
                {revokeError.message}
              </Alert>
            </StackItem>
          )}
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="danger"
          isLoading={revoking}
          isDisabled={revoking || activeKeys.length === 0}
          onClick={handleRevoke}
          data-testid="admin-revoke-keys-button"
        >
          Revoke all keys
        </Button>
        <Button
          variant="link"
          onClick={() => onClose(false)}
          data-testid="cancel-admin-revoke-button"
        >
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default AdminRevokeAllApiKeysModal;
