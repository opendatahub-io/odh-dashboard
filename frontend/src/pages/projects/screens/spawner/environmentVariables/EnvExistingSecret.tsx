import React from 'react';
import {
  Alert,
  Checkbox,
  FormGroup,
  FormHelperText,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { TypeaheadSelectOption } from '@patternfly/react-templates';
import { SecretKind } from '@odh-dashboard/k8s-core';
import { getSecret } from '#~/api/k8s/secrets';
import TypeaheadSelect from '#~/components/TypeaheadSelect';
import IndentSection from '#~/pages/projects/components/IndentSection';
import { EnvVariableData } from '#~/pages/projects/types';
import { getDashboardMainContainer } from '#~/utilities/utils';
import { useExistingSecrets } from './useExistingSecrets';

type EnvExistingSecretProps = {
  env: EnvVariableData;
  onUpdate: (envVariableData: EnvVariableData) => void;
  namespace: string;
};

const EnvExistingSecret: React.FC<EnvExistingSecretProps> = ({ env, onUpdate, namespace }) => {
  const [secrets, loaded, error] = useExistingSecrets(namespace, !!namespace);
  const [selectedSecret, setSelectedSecret] = React.useState<SecretKind | null>(null);
  const [availableKeys, setAvailableKeys] = React.useState<string[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = React.useState(false);

  const selectedSecretName = React.useMemo(() => {
    if (env.data.length > 0) {
      return env.data[0]?.key.split('/')[0];
    }
    return '';
  }, [env.data]);

  const selectedKeys = React.useMemo(() => {
    return env.data.map((entry) => entry.key);
  }, [env.data]);

  React.useEffect(() => {
    if (selectedSecretName && !selectedSecret) {
      setIsLoadingKeys(true);
      getSecret(namespace, selectedSecretName)
        .then((secret) => {
          setSelectedSecret(secret);
          const keys = Object.keys(secret.data || {});
          setAvailableKeys(keys);
        })
        .catch(() => {
          setSelectedSecret(null);
          setAvailableKeys([]);
        })
        .finally(() => {
          setIsLoadingKeys(false);
        });
    }
  }, [selectedSecretName, namespace, selectedSecret]);

  const handleSecretSelection = React.useCallback(
    (_event: React.MouseEvent | React.KeyboardEvent | undefined, selection: string | number) => {
      const secretName = String(selection);
      setIsLoadingKeys(true);

      getSecret(namespace, secretName)
        .then((secret) => {
          setSelectedSecret(secret);
          const keys = Object.keys(secret.data || {});
          setAvailableKeys(keys);

          // Initialize with empty selection
          onUpdate({
            ...env,
            data: [],
            allKeys: false,
          });
        })
        .catch(() => {
          setSelectedSecret(null);
          setAvailableKeys([]);
        })
        .finally(() => {
          setIsLoadingKeys(false);
        });
    },
    [namespace, env, onUpdate],
  );

  const handleAllKeysChange = React.useCallback(
    (checked: boolean) => {
      if (checked) {
        // Select all keys
        const allKeyEntries = availableKeys.map((key) => ({ key, value: '' }));
        onUpdate({
          ...env,
          data: allKeyEntries,
          allKeys: true,
        });
      } else {
        // Deselect all
        onUpdate({
          ...env,
          data: [],
          allKeys: false,
        });
      }
    },
    [availableKeys, env, onUpdate],
  );

  const handleKeySelection = React.useCallback(
    (key: string, checked: boolean) => {
      if (checked) {
        // Add key
        onUpdate({
          ...env,
          data: [...env.data, { key, value: '' }],
          allKeys: false,
        });
      } else {
        // Remove key
        const newData = env.data.filter((entry) => entry.key !== key);
        onUpdate({
          ...env,
          data: newData,
          allKeys: false,
        });
      }
    },
    [env, onUpdate],
  );

  if (!namespace) {
    return (
      <Alert variant="info" isInline title="No project context">
        Existing secrets cannot be loaded without a project context.
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert variant="danger" isInline title="Error loading secrets">
        {error.message}
      </Alert>
    );
  }

  let placeholderText: string;

  if (!loaded) {
    placeholderText = 'Loading secrets';
  } else if (secrets.length === 0) {
    placeholderText = 'No existing secrets available';
  } else {
    placeholderText = 'Select a secret';
  }

  const selectOptions: TypeaheadSelectOption[] = secrets.map((secret) => ({
    value: secret.metadata.name,
    content: secret.metadata.name,
  }));

  return (
    <Stack hasGutter>
      <StackItem>
        <FormGroup isRequired label="Secret" fieldId="existing-secret-selector">
          <TypeaheadSelect
            selectOptions={selectOptions}
            selected={selectedSecretName}
            onSelect={handleSecretSelection}
            placeholder={placeholderText}
            noOptionsFoundMessage={(filter) => `No secret was found for "${filter}"`}
            popperProps={{ appendTo: getDashboardMainContainer() }}
            isDisabled={!loaded}
            data-testid="existing-secret-typeahead"
          />
          <FormHelperText>
            <Alert variant="info" title="Select an existing secret" isInline isPlain />
          </FormHelperText>
        </FormGroup>
      </StackItem>

      {selectedSecret && (
        <StackItem>
          <IndentSection>
            <Stack hasGutter>
              <StackItem>
                <FormGroup label="Keys" fieldId="secret-keys">
                  {isLoadingKeys ? (
                    <div>Loading keys...</div>
                  ) : (
                    <Stack hasGutter>
                      <StackItem>
                        <Checkbox
                          id="all-keys-checkbox"
                          label="All keys"
                          isChecked={env.allKeys || false}
                          onChange={(_event, checked) => handleAllKeysChange(checked)}
                          data-testid="all-keys-checkbox"
                        />
                      </StackItem>
                      {!env.allKeys &&
                        availableKeys.map((key) => (
                          <StackItem key={key}>
                            <Checkbox
                              id={`key-checkbox-${key}`}
                              label={key}
                              isChecked={selectedKeys.includes(key)}
                              onChange={(_event, checked) => handleKeySelection(key, checked)}
                              data-testid={`key-checkbox-${key}`}
                            />
                          </StackItem>
                        ))}
                    </Stack>
                  )}
                  <FormHelperText>
                    <Alert
                      variant="warning"
                      title="Secret values are never displayed. Only key names are shown."
                      isInline
                      isPlain
                    />
                  </FormHelperText>
                </FormGroup>
              </StackItem>
            </Stack>
          </IndentSection>
        </StackItem>
      )}
    </Stack>
  );
};

export default EnvExistingSecret;
