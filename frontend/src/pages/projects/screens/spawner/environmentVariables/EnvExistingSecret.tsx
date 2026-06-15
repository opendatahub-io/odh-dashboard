import * as React from 'react';
import { Checkbox, FormGroup, Spinner, Stack, StackItem } from '@patternfly/react-core';
import TypeaheadSelect, { TypeaheadSelectOption } from '#~/components/TypeaheadSelect';
import { getDashboardMainContainer } from '#~/utilities/utils';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import { ExistingSecretRef } from '#~/pages/projects/types';
import { SecretSummary, useExistingSecrets } from './useExistingSecrets';

type EnvExistingSecretProps = {
  instanceId: number;
  existingSecretRef?: ExistingSecretRef;
  onUpdate: (ref: ExistingSecretRef) => void;
};

const popperProps = { appendTo: getDashboardMainContainer };

const EnvExistingSecret: React.FC<EnvExistingSecretProps> = ({
  instanceId,
  existingSecretRef,
  onUpdate,
}) => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const namespace = currentProject.metadata.name;
  const [secrets, secretsLoaded] = useExistingSecrets(namespace);

  const secretName = existingSecretRef?.secretName;

  const selectedSecret = React.useMemo<SecretSummary | undefined>(
    () => (secretName ? secrets.find((s) => s.name === secretName) : undefined),
    [secrets, secretName],
  );

  const secretKeyNames = React.useMemo(() => selectedSecret?.keys ?? [], [selectedSecret]);

  const secretOptions = React.useMemo<TypeaheadSelectOption[]>(
    () => secrets.map((s) => ({ value: s.name, content: s.name })),
    [secrets],
  );

  React.useEffect(() => {
    if (secretsLoaded && secretName && !selectedSecret) {
      onUpdate({ secretName: '', selectedKeys: [], allKeys: false });
    }
  }, [secretsLoaded, secretName, selectedSecret, onUpdate]);

  const handleSecretSelect = React.useCallback(
    (
      _event: React.MouseEvent | React.KeyboardEvent<HTMLInputElement> | undefined,
      value: string | number,
    ) => {
      const name = String(value);
      const secret = secrets.find((s) => s.name === name);
      const keys = secret?.keys ?? [];
      onUpdate({
        secretName: name,
        selectedKeys: keys,
        allKeys: keys.length > 0,
      });
    },
    [secrets, onUpdate],
  );

  const handleClearSelection = React.useCallback(() => {
    onUpdate({ secretName: '', selectedKeys: [], allKeys: false });
  }, [onUpdate]);

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
        allKeys: newKeys.length === secretKeyNames.length && newKeys.length > 0,
      });
    },
    [existingSecretRef, secretKeyNames, onUpdate],
  );

  const selectFieldId = `existing-secret-select-${instanceId}`;
  const allKeysId = `existing-secret-${instanceId}-all-keys`;

  if (!secretsLoaded) {
    return <Spinner size="md" aria-label="Loading secrets" data-testid="existing-secret-spinner" />;
  }

  return (
    <Stack hasGutter data-testid="env-existing-secret">
      <StackItem>
        <FormGroup label="Secret" fieldId={selectFieldId} isRequired>
          <TypeaheadSelect
            selectOptions={secretOptions}
            selected={secretName}
            onSelect={handleSecretSelect}
            placeholder="Select a secret"
            noOptionsAvailableMessage="No secrets available in this project"
            noOptionsFoundMessage={(filter) => `No secrets found for "${filter}"`}
            popperProps={popperProps}
            dataTestId={selectFieldId}
            isRequired
            allowClear
            onClearSelection={handleClearSelection}
          />
        </FormGroup>
      </StackItem>
      {secretName && selectedSecret && secretKeyNames.length > 0 && (
        <StackItem>
          <FormGroup label="Keys" fieldId={allKeysId}>
            <Stack hasGutter>
              <StackItem>
                <Checkbox
                  id={allKeysId}
                  data-testid={allKeysId}
                  label="All keys"
                  isChecked={existingSecretRef.allKeys}
                  onChange={handleAllKeysToggle}
                />
              </StackItem>
              {secretKeyNames.map((key) => {
                const keyId = `existing-secret-${instanceId}-key-${key}`;
                return (
                  <StackItem key={key}>
                    <Checkbox
                      id={keyId}
                      data-testid={keyId}
                      label={key}
                      isChecked={existingSecretRef.selectedKeys.includes(key)}
                      onChange={(_event, checked) => handleKeyToggle(key, checked)}
                    />
                  </StackItem>
                );
              })}
            </Stack>
          </FormGroup>
        </StackItem>
      )}
    </Stack>
  );
};

export default EnvExistingSecret;
