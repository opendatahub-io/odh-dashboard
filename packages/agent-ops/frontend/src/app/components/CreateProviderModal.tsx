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
  Spinner,
  Stack,
  StackItem,
  TextInput,
  ValidatedOptions,
} from '@patternfly/react-core';
import SimpleSelect from '@odh-dashboard/ui-core/components/SimpleSelect';
import { useMutation } from '@tanstack/react-query';
import { type APIOptions, useFetchState, type FetchStateCallbackPromise } from 'mod-arch-core';
import { createProvider, listProviderProfiles } from '~/app/api/providers';
import type { CreateProviderRequest } from '~/app/types/provider';
import type { ProviderProfile } from '~/app/types/provider';

type CreateProviderModalProps = {
  isOpen: boolean;
  gatewayName: string;
  onClose: () => void;
  onCreated: () => void;
};

const CreateProviderModal: React.FC<CreateProviderModalProps> = ({
  isOpen,
  gatewayName,
  onClose,
  onCreated,
}) => {
  const [providerName, setProviderName] = React.useState('');
  const [selectedProfileName, setSelectedProfileName] = React.useState('');
  const [credentials, setCredentials] = React.useState<Record<string, string>>({});

  const fetchProfiles = React.useCallback<FetchStateCallbackPromise<ProviderProfile[]>>(
    async (opts) => {
      if (!gatewayName) {
        return [];
      }
      return listProviderProfiles('', gatewayName)(opts);
    },
    [gatewayName],
  );

  const [profiles, profilesLoaded] = useFetchState<ProviderProfile[]>(fetchProfiles, []);

  const selectedProfile = React.useMemo(
    () => profiles.find((p) => p.name === selectedProfileName),
    [profiles, selectedProfileName],
  );

  const profileOptions = React.useMemo(
    () =>
      profiles.map((p) => ({
        key: p.name,
        label: p.name,
        description: p.description,
      })),
    [profiles],
  );

  const handleProfileChange = React.useCallback(
    (value: string) => {
      setSelectedProfileName(value);
      setCredentials({});
    },
    [],
  );

  const handleCredentialChange = React.useCallback(
    (fieldName: string, value: string) => {
      setCredentials((prev) => ({ ...prev, [fieldName]: value }));
    },
    [],
  );

  const resetForm = React.useCallback(() => {
    setProviderName('');
    setSelectedProfileName('');
    setCredentials({});
  }, []);

  const { mutate, isPending, error } = useMutation({
    mutationKey: ['agent-ops', 'createProvider', gatewayName],
    mutationFn: async (request: CreateProviderRequest) => {
      const apiOpts: APIOptions = {};
      return createProvider('', gatewayName)(apiOpts, request);
    },
    onSuccess: () => {
      resetForm();
      onCreated();
    },
    retry: false,
  });

  const isValid = React.useMemo(() => {
    if (!providerName.trim() || !selectedProfile) {
      return false;
    }
    const requiredFields = selectedProfile.credentials.filter((f) => f.required);
    return requiredFields.every((field) => (credentials[field.name] ?? '').trim().length > 0);
  }, [providerName, selectedProfile, credentials]);

  const handleSubmit = React.useCallback(() => {
    if (!selectedProfile) {
      return;
    }
    const request: CreateProviderRequest = {
      name: providerName.trim(),
      profileName: selectedProfile.name,
      credentials,
      config: {},
    };
    mutate(request);
  }, [providerName, selectedProfile, credentials, mutate]);

  const handleClose = React.useCallback(() => {
    if (!isPending) {
      resetForm();
      onClose();
    }
  }, [isPending, resetForm, onClose]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      variant="medium"
      data-testid="create-provider-modal"
    >
      <ModalHeader title="Add provider" />
      <ModalBody>
        <Stack hasGutter>
          {error ? (
            <StackItem>
              <Alert
                variant="danger"
                title="Failed to add provider"
                isInline
                data-testid="create-provider-error"
              >
                {error instanceof Error ? error.message : 'An unexpected error occurred.'}
              </Alert>
            </StackItem>
          ) : null}
          <StackItem>
            <Form>
              <FormGroup label="Provider name" isRequired fieldId="provider-name">
                <TextInput
                  id="provider-name"
                  data-testid="provider-name-input"
                  value={providerName}
                  onChange={(_event, value) => setProviderName(value)}
                  placeholder="my-openai-provider"
                  isDisabled={isPending}
                  isRequired
                />
              </FormGroup>
              <FormGroup label="Profile" isRequired fieldId="provider-profile">
                {!profilesLoaded ? (
                  <Spinner size="md" aria-label="Loading profiles" />
                ) : (
                  <SimpleSelect
                    dataTestId="provider-profile-select"
                    placeholder="Select a profile"
                    value={selectedProfileName}
                    options={profileOptions}
                    onChange={handleProfileChange}
                    isFullWidth
                    isDisabled={isPending || profiles.length === 0}
                    popperProps={{ appendTo: 'inline' }}
                    toggleProps={{
                      id: 'provider-profile',
                      'aria-label': 'Provider profile',
                    }}
                  />
                )}
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem>
                      {selectedProfile?.description ?? 'Select a provider profile to configure credentials.'}
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              </FormGroup>
              {selectedProfile?.credentials.map((field) => (
                <FormGroup
                  key={field.name}
                  label={field.name}
                  isRequired={field.required}
                  fieldId={`provider-cred-${field.name}`}
                >
                  <TextInput
                    id={`provider-cred-${field.name}`}
                    data-testid={`provider-cred-${field.name}`}
                    type={field.secret ? 'password' : 'text'}
                    value={credentials[field.name] ?? ''}
                    onChange={(_event, value) => handleCredentialChange(field.name, value)}
                    isDisabled={isPending}
                    isRequired={field.required}
                    validated={
                      field.required && (credentials[field.name] ?? '').trim().length === 0
                        ? ValidatedOptions.error
                        : ValidatedOptions.default
                    }
                  />
                  {field.description ? (
                    <FormHelperText>
                      <HelperText>
                        <HelperTextItem>{field.description}</HelperTextItem>
                      </HelperText>
                    </FormHelperText>
                  ) : null}
                </FormGroup>
              ))}
            </Form>
          </StackItem>
        </Stack>
      </ModalBody>
      <ModalFooter>
        <Button
          variant="primary"
          onClick={handleSubmit}
          isDisabled={!isValid || isPending}
          isLoading={isPending}
          data-testid="create-provider-submit"
        >
          Add provider
        </Button>
        <Button
          variant="link"
          onClick={handleClose}
          isDisabled={isPending}
          data-testid="create-provider-cancel"
        >
          Cancel
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default CreateProviderModal;
