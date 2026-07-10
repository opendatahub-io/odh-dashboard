import React from 'react';
import { Stack, StackItem, Checkbox, Spinner, Alert } from '@patternfly/react-core';
import { SecretCategory, EnvVariableData } from '#~/pages/projects/types';
import TypeaheadSelect, { TypeaheadSelectOption } from '#~/components/TypeaheadSelect';
import { useExistingSecrets } from './useExistingSecrets';

type EnvExistingSecretFieldProps = {
  env: EnvVariableData;
  existingName?: string;
  onUpdate: (data: EnvVariableData) => void;
  onSecretSelect: (secretName: string) => void;
  namespace: string;
};

const EnvExistingSecretField: React.FC<EnvExistingSecretFieldProps> = ({
  env,
  existingName,
  onUpdate,
  onSecretSelect,
  namespace,
}) => {
  const [secrets, secretsLoaded, secretsError] = useExistingSecrets(namespace, true);

  // Find the selected secret to get its keys
  const selectedSecret = React.useMemo(() => {
    if (!existingName) return undefined;
    return secrets.find((secret) => secret.metadata.name === existingName);
  }, [secrets, existingName]);

  // Get available keys from the selected secret
  const availableKeys = React.useMemo(() => {
    if (!selectedSecret?.data) return [];
    return Object.keys(selectedSecret.data).toSorted();
  }, [selectedSecret]);

  // Current selected key names from env.data
  const selectedKeys = React.useMemo(() => {
    return env.data.map((entry) => entry.key);
  }, [env.data]);

  // Check if all keys are selected
  const allKeysSelected = availableKeys.length > 0 && selectedKeys.length === availableKeys.length;

  // Create options for TypeaheadSelect
  const secretOptions: TypeaheadSelectOption[] = React.useMemo(() => {
    return secrets.map((secret) => ({
      value: secret.metadata.name || '',
      content: secret.metadata.name || '',
      isSelected: secret.metadata.name === existingName,
    }));
  }, [secrets, existingName]);

  // Handle secret selection from dropdown
  const handleSecretSelect = React.useCallback(
    (
      _event:
        | React.MouseEvent<Element, MouseEvent>
        | React.KeyboardEvent<HTMLInputElement>
        | undefined,
      secretName: string | number,
    ) => {
      const name = String(secretName);
      onSecretSelect(name);
      onUpdate({
        category: SecretCategory.EXISTING,
        data: [],
      });
    },
    [onSecretSelect, onUpdate],
  );

  // Handle individual key selection
  const handleKeyToggle = React.useCallback(
    (keyName: string, checked: boolean) => {
      let newData = [...env.data];

      if (checked) {
        // Add key if not already present
        if (!selectedKeys.includes(keyName)) {
          newData.push({ key: keyName, value: '' });
        }
      } else {
        // Remove key
        newData = newData.filter((entry) => entry.key !== keyName);
      }

      onUpdate({
        category: SecretCategory.EXISTING,
        data: newData,
      });
    },
    [env.data, selectedKeys, onUpdate],
  );

  // Handle "All keys" toggle
  const handleAllKeysToggle = React.useCallback(
    (checked: boolean) => {
      if (checked) {
        // Select all available keys
        const allKeyEntries = availableKeys.map((key) => ({ key, value: '' }));
        onUpdate({
          category: SecretCategory.EXISTING,
          data: allKeyEntries,
        });
      } else {
        // Deselect all keys
        onUpdate({
          category: SecretCategory.EXISTING,
          data: [],
        });
      }
    },
    [availableKeys, onUpdate],
  );

  // Show loading state
  if (!secretsLoaded && !secretsError) {
    return (
      <Stack hasGutter>
        <StackItem>
          <Spinner size="sm" aria-label="Loading secrets" />
          <span className="pf-v6-u-ml-sm">Loading secrets...</span>
        </StackItem>
      </Stack>
    );
  }

  // Show error state
  if (secretsError) {
    return (
      <Alert variant="danger" isInline title="Error loading secrets">
        Error loading secrets: {secretsError.message}
      </Alert>
    );
  }

  return (
    <Stack hasGutter>
      <StackItem>
        <TypeaheadSelect
          selectOptions={secretOptions}
          onSelect={handleSecretSelect}
          placeholder="Select a secret"
          noOptionsAvailableMessage="No secrets are available"
          dataTestId="existing-secret-select"
          previewDescription={false}
        />
      </StackItem>

      {selectedSecret && availableKeys.length > 0 && (
        <StackItem>
          <Stack hasGutter>
            <StackItem>
              <Checkbox
                id="all-keys-checkbox"
                data-testid="existing-secret-all-keys"
                label="All keys"
                isChecked={allKeysSelected}
                onChange={(_event, checked) => handleAllKeysToggle(checked)}
              />
            </StackItem>

            {availableKeys.map((keyName) => (
              <StackItem key={keyName}>
                <Checkbox
                  id={`key-${keyName}`}
                  data-testid={`existing-secret-key-${keyName}`}
                  label={keyName}
                  isChecked={selectedKeys.includes(keyName)}
                  onChange={(_event, checked) => handleKeyToggle(keyName, checked)}
                />
              </StackItem>
            ))}
          </Stack>
        </StackItem>
      )}
    </Stack>
  );
};

export default EnvExistingSecretField;
