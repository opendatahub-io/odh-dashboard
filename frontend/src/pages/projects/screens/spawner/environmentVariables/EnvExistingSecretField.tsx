import * as React from 'react';
import { Checkbox, HelperText, HelperTextItem, Stack, StackItem } from '@patternfly/react-core';
import TypeaheadSelect, {
  TypeaheadSelectOption,
} from '@odh-dashboard/ui-core/components/TypeaheadSelect';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { EnvVariable, EnvVariableData, SecretCategory } from '#~/pages/projects/types';
import { useExistingSecrets } from './useExistingSecrets';

type EnvExistingSecretFieldProps = {
  env: EnvVariableData;
  onUpdate: (envVariableData: EnvVariableData) => void;
  onUpdateVariable?: (partial: Partial<EnvVariable>) => void;
  selectedSecretName?: string;
};

const EnvExistingSecretField: React.FC<EnvExistingSecretFieldProps> = ({
  env,
  onUpdate,
  onUpdateVariable,
  selectedSecretName,
}) => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const namespace = currentProject.metadata.name;

  const [secrets, loaded] = useExistingSecrets(namespace, true);

  const selectedSecret = React.useMemo(
    () => secrets.find((s) => s.metadata.name === selectedSecretName),
    [secrets, selectedSecretName],
  );

  const secretKeys = React.useMemo(
    () => (selectedSecret?.data ? Object.keys(selectedSecret.data) : []),
    [selectedSecret],
  );

  const selectedKeys = React.useMemo(() => new Set(env.data.map((entry) => entry.key)), [env.data]);

  const allKeysSelected = secretKeys.length > 0 && secretKeys.every((k) => selectedKeys.has(k));

  const options: TypeaheadSelectOption[] = React.useMemo(
    () =>
      secrets.map(
        (secret): TypeaheadSelectOption => ({
          content: secret.metadata.name,
          value: secret.metadata.name,
          isSelected: secret.metadata.name === selectedSecretName,
        }),
      ),
    [secrets, selectedSecretName],
  );

  const handleSecretSelect = React.useCallback(
    (
      _event:
        | React.MouseEvent<Element, MouseEvent>
        | React.KeyboardEvent<HTMLInputElement>
        | undefined,
      value: string | number,
    ) => {
      const secretName = String(value);
      const secret = secrets.find((s) => s.metadata.name === secretName);
      if (!secret) {
        return;
      }
      onUpdateVariable?.({ existingName: secretName });
      const allKeys = secret.data ? Object.keys(secret.data) : [];
      onUpdate({
        category: SecretCategory.EXISTING,
        data: allKeys.map((key) => ({ key, value: '' })),
      });
    },
    [secrets, onUpdate, onUpdateVariable],
  );

  const handleKeyToggle = React.useCallback(
    (key: string, checked: boolean) => {
      const newData = checked
        ? [...env.data, { key, value: '' }]
        : env.data.filter((entry) => entry.key !== key);
      onUpdate({ ...env, data: newData });
    },
    [env, onUpdate],
  );

  const handleSelectAllToggle = React.useCallback(
    (_event: React.FormEvent<HTMLInputElement>, checked: boolean) => {
      if (checked) {
        onUpdate({
          ...env,
          data: secretKeys.map((key) => ({ key, value: '' })),
        });
      } else {
        onUpdate({ ...env, data: [] });
      }
    },
    [env, onUpdate, secretKeys],
  );

  if (loaded && secrets.length === 0) {
    return (
      <HelperText>
        <HelperTextItem variant="indeterminate">
          No existing secrets found in this namespace
        </HelperTextItem>
      </HelperText>
    );
  }

  return (
    <Stack hasGutter>
      <StackItem data-testid="existing-secret-select">
        <TypeaheadSelect
          selectOptions={options}
          onSelect={handleSecretSelect}
          placeholder="Select a secret"
          noOptionsFoundMessage="No matching secrets"
          popperProps={{ appendTo: 'inline' }}
          previewDescription={false}
        />
      </StackItem>
      {selectedSecretName && secretKeys.length > 0 ? (
        <StackItem data-testid="existing-secret-key-checkboxes">
          <Stack hasGutter>
            <StackItem>
              <Checkbox
                id="select-all-keys"
                label="Select all keys"
                isChecked={allKeysSelected}
                onChange={handleSelectAllToggle}
                data-testid="existing-secret-select-all"
              />
            </StackItem>
            {secretKeys.map((key) => (
              <StackItem key={key}>
                <Checkbox
                  id={`key-${key}`}
                  label={key}
                  isChecked={selectedKeys.has(key)}
                  onChange={(_event, checked) => handleKeyToggle(key, checked)}
                  data-testid={`existing-secret-key-checkbox-${key}`}
                />
              </StackItem>
            ))}
          </Stack>
        </StackItem>
      ) : null}
    </Stack>
  );
};

export default EnvExistingSecretField;
