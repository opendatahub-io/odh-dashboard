import * as React from 'react';
import { Button, Checkbox, Split, SplitItem, Stack, StackItem } from '@patternfly/react-core';
import { MinusCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import type { SecretKind } from '@odh-dashboard/k8s-core';
import TypeaheadSelect, { TypeaheadSelectOption } from '#~/components/TypeaheadSelect';
import { ExistingSecretRef } from '#~/pages/projects/types';
import useNamespaceSecrets from './useNamespaceSecrets';

type EnvExistingSecretProps = {
  namespace: string;
  existingSecretRefs?: ExistingSecretRef[];
  onUpdate: (refs: ExistingSecretRef[]) => void;
};

const EMPTY_REF: ExistingSecretRef = {
  secretName: '',
  selectedKeys: [],
  allKeys: false,
};

const getSecretKeys = (secrets: SecretKind[], secretName: string): string[] => {
  const secret = secrets.find((s) => s.metadata.name === secretName);
  if (!secret?.data) {
    return [];
  }
  return Object.keys(secret.data);
};

const EnvExistingSecret: React.FC<EnvExistingSecretProps> = ({
  namespace,
  existingSecretRefs = [],
  onUpdate,
}) => {
  const { data: secrets } = useNamespaceSecrets(namespace, true);

  const secretOptions = React.useMemo<TypeaheadSelectOption[]>(
    () =>
      secrets.map((s) => ({
        content: s.metadata.name,
        value: s.metadata.name,
      })),
    [secrets],
  );

  const handleSecretSelect = React.useCallback(
    (index: number, secretName: string) => {
      const updated = existingSecretRefs.map((ref, i) =>
        i === index ? { ...ref, secretName, selectedKeys: [], allKeys: false } : ref,
      );
      onUpdate(updated);
    },
    [existingSecretRefs, onUpdate],
  );

  const handleAllKeysToggle = React.useCallback(
    (index: number, checked: boolean) => {
      const ref = existingSecretRefs[index];
      const allKeys = getSecretKeys(secrets, ref.secretName);
      const updated = existingSecretRefs.map((r, i) =>
        i === index ? { ...r, allKeys: checked, selectedKeys: checked ? allKeys : [] } : r,
      );
      onUpdate(updated);
    },
    [existingSecretRefs, secrets, onUpdate],
  );

  const handleKeyToggle = React.useCallback(
    (index: number, key: string, checked: boolean) => {
      const ref = existingSecretRefs[index];
      const allSecretKeys = getSecretKeys(secrets, ref.secretName);
      const newSelectedKeys = checked
        ? [...ref.selectedKeys, key]
        : ref.selectedKeys.filter((k) => k !== key);
      const newAllKeys = newSelectedKeys.length === allSecretKeys.length;
      const updated = existingSecretRefs.map((r, i) =>
        i === index ? { ...r, selectedKeys: newSelectedKeys, allKeys: newAllKeys } : r,
      );
      onUpdate(updated);
    },
    [existingSecretRefs, secrets, onUpdate],
  );

  const handleRemove = React.useCallback(
    (index: number) => {
      onUpdate(existingSecretRefs.filter((_, i) => i !== index));
    },
    [existingSecretRefs, onUpdate],
  );

  const handleAdd = React.useCallback(() => {
    onUpdate([...existingSecretRefs, EMPTY_REF]);
  }, [existingSecretRefs, onUpdate]);

  return (
    <Stack hasGutter>
      {existingSecretRefs.map((ref, index) => {
        const keys = getSecretKeys(secrets, ref.secretName);
        return (
          <StackItem key={index} data-testid={`existing-secret-block-${index}`}>
            <Split>
              <SplitItem isFilled>
                <Stack hasGutter>
                  <StackItem>
                    <TypeaheadSelect
                      selectOptions={secretOptions}
                      selected={ref.secretName || undefined}
                      onSelect={(_e, value) => handleSecretSelect(index, String(value))}
                      placeholder="Select a secret"
                      dataTestId={`existing-secret-selector-${index}`}
                      isRequired={false}
                    />
                  </StackItem>
                  {ref.secretName && keys.length > 0 && (
                    <StackItem data-testid={`existing-secret-key-select-${index}`}>
                      <Stack hasGutter>
                        <StackItem>
                          <Checkbox
                            id={`all-keys-${index}`}
                            label="All keys"
                            isChecked={ref.allKeys}
                            onChange={(_e, checked) => handleAllKeysToggle(index, checked)}
                            data-testid={`existing-secret-all-keys-${index}`}
                          />
                        </StackItem>
                        {keys.map((key) => (
                          <StackItem key={key}>
                            <Checkbox
                              id={`key-${index}-${key}`}
                              label={key}
                              isChecked={ref.selectedKeys.includes(key)}
                              onChange={(_e, checked) => handleKeyToggle(index, key, checked)}
                              data-testid={`existing-secret-key-${index}-${key}`}
                            />
                          </StackItem>
                        ))}
                      </Stack>
                    </StackItem>
                  )}
                </Stack>
              </SplitItem>
              <SplitItem>
                <Button
                  aria-label="Remove secret"
                  variant="plain"
                  icon={<MinusCircleIcon />}
                  onClick={() => handleRemove(index)}
                  data-testid={`remove-existing-secret-${index}`}
                />
              </SplitItem>
            </Split>
          </StackItem>
        );
      })}
      <StackItem>
        <Button
          variant="link"
          isInline
          icon={<PlusCircleIcon />}
          iconPosition="left"
          onClick={handleAdd}
          data-testid="add-existing-secret-button"
        >
          Add secret
        </Button>
      </StackItem>
    </Stack>
  );
};

export default EnvExistingSecret;
