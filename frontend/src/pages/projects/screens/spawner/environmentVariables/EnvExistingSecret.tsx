import * as React from 'react';
import { Checkbox, Stack, StackItem, Spinner } from '@patternfly/react-core';
import type { SecretKind } from '@odh-dashboard/k8s-core';
import { getSecret } from '#~/api';
import { EnvVariableData, SecretCategory } from '#~/pages/projects/types';
import TypeaheadSelect, { TypeaheadSelectOption } from '#~/components/TypeaheadSelect';
import { useExistingSecrets } from './useExistingSecrets';

type EnvExistingSecretProps = {
  env?: EnvVariableData;
  selectedSecretName?: string;
  onUpdate: (data: EnvVariableData, secretName?: string) => void;
  namespace: string;
};

const EnvExistingSecret: React.FC<EnvExistingSecretProps> = ({
  env,
  selectedSecretName,
  onUpdate,
  namespace,
}) => {
  const [secrets, secretsLoaded] = useExistingSecrets(namespace, true);
  const [secretKeys, setSecretKeys] = React.useState<string[]>([]);
  const [loadingKeys, setLoadingKeys] = React.useState(false);
  const [currentSecretName, setCurrentSecretName] = React.useState<string>(
    selectedSecretName ?? '',
  );

  const selectedKeys = React.useMemo(
    () => (env?.data ?? []).map((entry) => entry.key),
    [env?.data],
  );

  // Fetch secret keys when a secret is selected
  React.useEffect(() => {
    if (!currentSecretName) {
      setSecretKeys([]);
      return;
    }

    let cancelled = false;
    setLoadingKeys(true);

    getSecret(namespace, currentSecretName)
      .then((secret: SecretKind) => {
        if (!cancelled) {
          setSecretKeys(Object.keys(secret.data ?? {}));
          setLoadingKeys(false);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSecretKeys([]);
          setLoadingKeys(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [namespace, currentSecretName]);

  const handleSecretSelect = React.useCallback(
    (_event: React.MouseEvent | React.KeyboardEvent | undefined, value: string | number) => {
      const name = String(value);
      setCurrentSecretName(name);
      // Clear selection when secret changes
      onUpdate(
        {
          category: SecretCategory.EXISTING,
          data: [],
        },
        name,
      );
    },
    [onUpdate],
  );

  const handleKeyToggle = React.useCallback(
    (keyName: string, checked: boolean) => {
      const currentKeys = new Set(selectedKeys);
      if (checked) {
        currentKeys.add(keyName);
      } else {
        currentKeys.delete(keyName);
      }

      onUpdate(
        {
          category: SecretCategory.EXISTING,
          data: Array.from(currentKeys).map((k) => ({ key: k, value: '' })),
        },
        currentSecretName,
      );
    },
    [selectedKeys, currentSecretName, onUpdate],
  );

  const handleAllKeysToggle = React.useCallback(
    (_event: React.FormEvent<HTMLInputElement>, checked: boolean) => {
      if (checked) {
        onUpdate(
          {
            category: SecretCategory.EXISTING,
            data: secretKeys.map((k) => ({ key: k, value: '' })),
          },
          currentSecretName,
        );
      } else {
        onUpdate(
          {
            category: SecretCategory.EXISTING,
            data: [],
          },
          currentSecretName,
        );
      }
    },
    [secretKeys, currentSecretName, onUpdate],
  );

  const allKeysSelected =
    secretKeys.length > 0 && secretKeys.every((k) => selectedKeys.includes(k));

  const secretOptions: TypeaheadSelectOption[] = React.useMemo(
    () =>
      secrets.map((secret) => ({
        value: secret.metadata.name,
        content: secret.metadata.name,
      })),
    [secrets],
  );

  return (
    <Stack hasGutter>
      <StackItem data-testid="existing-secret-selector">
        <TypeaheadSelect
          selectOptions={secretOptions}
          placeholder={secretsLoaded ? 'Select a secret' : 'Loading secrets...'}
          onSelect={handleSecretSelect}
          isDisabled={!secretsLoaded}
          selected={currentSecretName || undefined}
          dataTestId="existing-secret-typeahead"
        />
      </StackItem>
      {currentSecretName && !loadingKeys && (
        <StackItem data-testid="existing-secret-key-picker">
          <Stack hasGutter>
            {secretKeys.length > 0 && (
              <StackItem>
                <Checkbox
                  id="all-keys-checkbox"
                  data-testid="all-keys-checkbox"
                  label="All keys"
                  isChecked={allKeysSelected}
                  onChange={handleAllKeysToggle}
                />
              </StackItem>
            )}
            {secretKeys.map((keyName) => (
              <StackItem key={keyName}>
                <Checkbox
                  id={`key-checkbox-${keyName}`}
                  data-testid={`key-checkbox-${keyName}`}
                  label={keyName}
                  isChecked={selectedKeys.includes(keyName)}
                  onChange={(_event, checked) => handleKeyToggle(keyName, checked)}
                />
              </StackItem>
            ))}
          </Stack>
        </StackItem>
      )}
      {currentSecretName && loadingKeys && (
        <StackItem>
          <Spinner size="md" data-testid="key-loading-spinner" />
        </StackItem>
      )}
    </Stack>
  );
};

export default EnvExistingSecret;
