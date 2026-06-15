import * as React from 'react';
import { Checkbox, FormGroup, Spinner, Stack, StackItem } from '@patternfly/react-core';
import TypeaheadSelect, { TypeaheadSelectOption } from '#~/components/TypeaheadSelect';
import { getDashboardMainContainer } from '#~/utilities/utils';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { SecretKind } from '#~/k8sTypes';
import { ExistingSecretRef } from '#~/pages/projects/types';
import { useExistingSecrets } from './useExistingSecrets';

type EnvExistingSecretProps = {
  existingSecretRef?: ExistingSecretRef;
  onUpdate: (ref: ExistingSecretRef) => void;
};

const EnvExistingSecret: React.FC<EnvExistingSecretProps> = ({ existingSecretRef, onUpdate }) => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const namespace = currentProject.metadata.name;
  const [secrets, secretsLoaded] = useExistingSecrets(namespace);

  const selectedSecret = React.useMemo<SecretKind | undefined>(
    () =>
      existingSecretRef
        ? secrets.find((s) => s.metadata.name === existingSecretRef.secretName)
        : undefined,
    [secrets, existingSecretRef],
  );

  const secretKeyNames = React.useMemo<string[]>(
    () => (selectedSecret?.data ? Object.keys(selectedSecret.data) : []),
    [selectedSecret],
  );

  const secretOptions = React.useMemo<TypeaheadSelectOption[]>(
    () =>
      secrets.map((secret) => ({
        value: secret.metadata.name,
        content: secret.metadata.name,
      })),
    [secrets],
  );

  const handleSecretSelect = React.useCallback(
    (
      _event: React.MouseEvent | React.KeyboardEvent<HTMLInputElement> | undefined,
      value: string | number,
    ) => {
      const secretName = String(value);
      const secret = secrets.find((s) => s.metadata.name === secretName);
      const allKeys = secret?.data ? Object.keys(secret.data) : [];
      onUpdate({
        secretName,
        selectedKeys: allKeys,
        allKeys: true,
      });
    },
    [secrets, onUpdate],
  );

  const handleAllKeysToggle = React.useCallback(
    (_event: React.FormEvent<HTMLInputElement>, checked: boolean) => {
      if (!existingSecretRef) {
        return;
      }
      onUpdate({
        ...existingSecretRef,
        allKeys: checked,
        selectedKeys: checked ? secretKeyNames : [],
      });
    },
    [existingSecretRef, secretKeyNames, onUpdate],
  );

  const handleKeyToggle = React.useCallback(
    (key: string, checked: boolean) => {
      if (!existingSecretRef) {
        return;
      }
      const newKeys = checked
        ? [...existingSecretRef.selectedKeys, key]
        : existingSecretRef.selectedKeys.filter((k) => k !== key);
      onUpdate({
        ...existingSecretRef,
        selectedKeys: newKeys,
        allKeys: newKeys.length === secretKeyNames.length,
      });
    },
    [existingSecretRef, secretKeyNames, onUpdate],
  );

  if (!secretsLoaded) {
    return <Spinner size="md" aria-label="Loading secrets" />;
  }

  return (
    <Stack hasGutter>
      <StackItem>
        <FormGroup label="Secret" fieldId="existing-secret-select" isRequired>
          <TypeaheadSelect
            selectOptions={secretOptions}
            selected={existingSecretRef?.secretName}
            onSelect={handleSecretSelect}
            placeholder="Select a secret"
            noOptionsAvailableMessage="No secrets available in this project"
            noOptionsFoundMessage={(filter) => `No secrets found for "${filter}"`}
            popperProps={{ appendTo: getDashboardMainContainer() }}
            dataTestId="existing-secret-select"
            isRequired
            allowClear
            onClearSelection={() => onUpdate({ secretName: '', selectedKeys: [], allKeys: false })}
          />
        </FormGroup>
      </StackItem>
      {existingSecretRef?.secretName && selectedSecret && secretKeyNames.length > 0 && (
        <StackItem>
          <FormGroup label="Keys" fieldId="existing-secret-keys">
            <Stack hasGutter>
              <StackItem>
                <Checkbox
                  id="existing-secret-all-keys"
                  data-testid="existing-secret-all-keys"
                  label="All keys"
                  isChecked={existingSecretRef.allKeys}
                  onChange={handleAllKeysToggle}
                />
              </StackItem>
              {secretKeyNames.map((key) => (
                <StackItem key={key}>
                  <Checkbox
                    id={`existing-secret-key-${key}`}
                    data-testid={`existing-secret-key-${key}`}
                    label={key}
                    isChecked={existingSecretRef.selectedKeys.includes(key)}
                    onChange={(_event, checked) => handleKeyToggle(key, checked)}
                  />
                </StackItem>
              ))}
            </Stack>
          </FormGroup>
        </StackItem>
      )}
    </Stack>
  );
};

export default EnvExistingSecret;
