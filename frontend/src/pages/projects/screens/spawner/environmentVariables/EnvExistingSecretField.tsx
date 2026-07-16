import * as React from 'react';
import { Checkbox, FormGroup, Spinner, Stack, StackItem } from '@patternfly/react-core';
import TypeaheadSelect from '@odh-dashboard/ui-core/components/TypeaheadSelect';
import type { TypeaheadSelectOption } from '@odh-dashboard/ui-core/components/TypeaheadSelect';
import type { SecretKind } from '@odh-dashboard/k8s-core';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { EnvVariableDataEntry } from '#~/pages/projects/types';
import { useExistingSecrets } from './useExistingSecrets';

type EnvExistingSecretFieldProps = {
  secretName?: string;
  selectedKeys: EnvVariableDataEntry[];
  onUpdate: (data: { secretName: string; keys: EnvVariableDataEntry[] }) => void;
};

const EnvExistingSecretField: React.FC<EnvExistingSecretFieldProps> = ({
  secretName,
  selectedKeys,
  onUpdate,
}) => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const namespace = currentProject.metadata.name;

  const [secrets, secretsLoaded] = useExistingSecrets(namespace, true);

  const selectOptions: TypeaheadSelectOption[] = React.useMemo(
    () =>
      secrets.map((s) => ({
        content: s.metadata.name,
        value: s.metadata.name,
      })),
    [secrets],
  );

  const selectedSecret: SecretKind | undefined = React.useMemo(
    () => secrets.find((s) => s.metadata.name === secretName),
    [secrets, secretName],
  );

  const secretKeys: string[] = React.useMemo(
    () => (selectedSecret?.data ? Object.keys(selectedSecret.data) : []),
    [selectedSecret],
  );

  const selectedKeyNames = React.useMemo(
    () => new Set(selectedKeys.map((k) => k.key)),
    [selectedKeys],
  );

  const allKeysSelected = secretKeys.length > 0 && secretKeys.every((k) => selectedKeyNames.has(k));

  const handleSecretSelect = (_event: unknown, value: string | number) => {
    const newSecretName = String(value);
    const newSecret = secrets.find((s) => s.metadata.name === newSecretName);
    const allKeys = newSecret?.data ? Object.keys(newSecret.data) : [];
    onUpdate({
      secretName: newSecretName,
      keys: allKeys.map((key) => ({ key, value: '' })),
    });
  };

  const handleSelectAllKeys = (_event: React.FormEvent<HTMLInputElement>, checked: boolean) => {
    if (!secretName) {
      return;
    }
    if (checked) {
      onUpdate({
        secretName,
        keys: secretKeys.map((key) => ({ key, value: '' })),
      });
    } else {
      onUpdate({
        secretName,
        keys: [],
      });
    }
  };

  const handleKeyToggle = (keyName: string, checked: boolean) => {
    if (!secretName) {
      return;
    }
    const newKeys = checked
      ? [...selectedKeys, { key: keyName, value: '' }]
      : selectedKeys.filter((k) => k.key !== keyName);
    onUpdate({ secretName, keys: newKeys });
  };

  if (!secretsLoaded) {
    return <Spinner size="md" data-testid="existing-secret-loading" />;
  }

  return (
    <Stack hasGutter>
      <StackItem>
        <FormGroup label="Secret" fieldId="existing-secret-select">
          <TypeaheadSelect
            dataTestId="existing-secret-select"
            selectOptions={selectOptions}
            selected={secretName}
            onSelect={handleSecretSelect}
            placeholder="Select a secret"
            noOptionsAvailableMessage="No secrets available"
            isRequired={false}
          />
        </FormGroup>
      </StackItem>
      {secretName && secretKeys.length > 0 ? (
        <StackItem>
          <FormGroup label="Keys" fieldId="existing-secret-keys">
            <Stack hasGutter>
              <StackItem>
                <Checkbox
                  id="existing-secret-select-all"
                  data-testid="existing-secret-select-all"
                  label="Select all keys"
                  isChecked={allKeysSelected}
                  onChange={handleSelectAllKeys}
                />
              </StackItem>
              {secretKeys.map((keyName) => (
                <StackItem key={keyName}>
                  <Checkbox
                    id={`existing-secret-key-${keyName}`}
                    data-testid={`existing-secret-key-${keyName}`}
                    label={keyName}
                    isChecked={selectedKeyNames.has(keyName)}
                    onChange={(_event, checked) => handleKeyToggle(keyName, checked)}
                  />
                </StackItem>
              ))}
            </Stack>
          </FormGroup>
        </StackItem>
      ) : null}
    </Stack>
  );
};

export default EnvExistingSecretField;
