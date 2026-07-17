import * as React from 'react';
import {
  Badge,
  Button,
  Checkbox,
  ExpandableSection,
  FormGroup,
  HelperText,
  HelperTextItem,
  Icon,
  Stack,
  StackItem,
  Alert,
  Flex,
  FlexItem,
  Spinner,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import type { SecretKind } from '@odh-dashboard/k8s-core';
import { ExistingSecretRef } from '#~/pages/projects/types';
import { MultiSelection, SelectionOptions } from '#~/components/MultiSelection';

type ExistingSecretFieldProps = {
  existingSecretRefs: ExistingSecretRef[];
  onUpdate: (refs: ExistingSecretRef[]) => void;
  availableSecrets: SecretKind[];
  secretsLoaded: boolean;
  secretsError?: Error;
};

const ExistingSecretField: React.FC<ExistingSecretFieldProps> = ({
  existingSecretRefs,
  onUpdate,
  availableSecrets,
  secretsLoaded,
  secretsError,
}) => {
  const [expandedSecrets, setExpandedSecrets] = React.useState<Set<string>>(new Set());

  const secretsByName = React.useMemo(
    () => new Map(availableSecrets.map((s) => [s.metadata.name, s])),
    [availableSecrets],
  );

  const selectedSecretNames = React.useMemo(
    () => new Set(existingSecretRefs.map((ref) => ref.secretName)),
    [existingSecretRefs],
  );

  const secretOptions: SelectionOptions[] = React.useMemo(
    () =>
      availableSecrets.map((s) => ({
        id: s.metadata.name,
        name: s.metadata.name,
        selected: selectedSecretNames.has(s.metadata.name),
      })),
    [availableSecrets, selectedSecretNames],
  );

  const handleMultiSelectionChange = (newState: SelectionOptions[]) => {
    const newSelectedNames = new Set(newState.filter((o) => o.selected).map((o) => String(o.id)));

    // Keep existing refs that are still selected
    const keptRefs = existingSecretRefs.filter((ref) => newSelectedNames.has(ref.secretName));

    // Add new selections with allKeys=true by default
    const newRefs = [...newSelectedNames]
      .filter((name) => !selectedSecretNames.has(name))
      .map((name): ExistingSecretRef => ({ secretName: name, allKeys: true, selectedKeys: [] }));

    onUpdate([...keptRefs, ...newRefs]);
  };

  const handleToggleKey = (secretName: string, key: string, isChecked: boolean) => {
    const updatedRefs = existingSecretRefs.map((ref) => {
      if (ref.secretName !== secretName) {
        return ref;
      }
      const secret = secretsByName.get(secretName);
      const allSecretKeys = Object.keys(secret?.data || {});

      let newSelectedKeys: string[];
      if (ref.allKeys) {
        // Transitioning from allKeys to specific keys
        newSelectedKeys = isChecked ? allSecretKeys : allSecretKeys.filter((k) => k !== key);
      } else {
        newSelectedKeys = isChecked
          ? [...ref.selectedKeys, key]
          : ref.selectedKeys.filter((k) => k !== key);
      }

      const newAllKeys = newSelectedKeys.length === allSecretKeys.length;
      return {
        ...ref,
        allKeys: newAllKeys,
        selectedKeys: newAllKeys ? [] : newSelectedKeys,
      };
    });
    onUpdate(updatedRefs);
  };

  const getSelectedKeyCount = (ref: ExistingSecretRef): number => {
    if (ref.allKeys) {
      const secret = secretsByName.get(ref.secretName);
      return Object.keys(secret?.data || {}).length;
    }
    return ref.selectedKeys.length;
  };

  const getTotalKeyCount = (secretName: string): number => {
    const secret = secretsByName.get(secretName);
    return Object.keys(secret?.data || {}).length;
  };

  const isSecretMissing = (secretName: string): boolean => !secretsByName.has(secretName);

  if (secretsError) {
    return (
      <Alert
        variant="danger"
        isInline
        title="Unable to load secrets"
        data-testid="existing-secret-error"
      >
        {secretsError.message}
      </Alert>
    );
  }

  return (
    <Stack hasGutter>
      <StackItem>
        <FormGroup label="Secrets" isRequired fieldId="existing-secret-select">
          {!secretsLoaded ? (
            <Spinner size="md" data-testid="existing-secret-spinner" />
          ) : (
            <MultiSelection
              id="existing-secret-select"
              ariaLabel="Select secrets"
              toggleTestId="existing-secret-typeahead-toggle"
              hasCheckbox
              placeholder={
                existingSecretRefs.length > 0
                  ? `${existingSecretRefs.length} secret${
                      existingSecretRefs.length !== 1 ? 's' : ''
                    } selected`
                  : 'Select secrets'
              }
              value={secretOptions}
              setValue={handleMultiSelectionChange}
            />
          )}
        </FormGroup>
      </StackItem>

      {existingSecretRefs.map((ref) => {
        const secretMissing = isSecretMissing(ref.secretName);
        const secret = secretsByName.get(ref.secretName);
        const allKeys = Object.keys(secret?.data || {});
        const selectedCount = getSelectedKeyCount(ref);
        const totalCount = getTotalKeyCount(ref.secretName);
        const isExpanded = expandedSecrets.has(ref.secretName);
        const hasNoKeysSelected = !ref.allKeys && ref.selectedKeys.length === 0;

        return (
          <StackItem key={ref.secretName}>
            {secretMissing ? (
              <Alert
                variant="danger"
                isInline
                title="Secret not found"
                data-testid={`existing-secret-missing-${ref.secretName}`}
              >
                <Icon isInline status="danger">
                  <ExclamationCircleIcon />
                </Icon>{' '}
                The secret <strong>{ref.secretName}</strong> was not found. This workbench cannot
                start until the missing secret is restored or removed.
                <br />
                <Button
                  variant="link"
                  isInline
                  onClick={() =>
                    onUpdate(existingSecretRefs.filter((r) => r.secretName !== ref.secretName))
                  }
                  data-testid={`remove-missing-secret-${ref.secretName}`}
                >
                  Remove this reference
                </Button>
              </Alert>
            ) : (
              <ExpandableSection
                toggleContent={
                  <Flex
                    spaceItems={{ default: 'spaceItemsSm' }}
                    alignItems={{ default: 'alignItemsCenter' }}
                  >
                    <FlexItem>
                      <strong>{ref.secretName}</strong>
                    </FlexItem>
                    <FlexItem>
                      <Badge isRead data-testid={`secret-key-count-${ref.secretName}`}>
                        {selectedCount} of {totalCount} keys
                      </Badge>
                    </FlexItem>
                  </Flex>
                }
                isExpanded={isExpanded}
                onToggle={() => {
                  setExpandedSecrets((prev) => {
                    const next = new Set(prev);
                    if (next.has(ref.secretName)) {
                      next.delete(ref.secretName);
                    } else {
                      next.add(ref.secretName);
                    }
                    return next;
                  });
                }}
                data-testid={`existing-secret-expandable-${ref.secretName}`}
              >
                <Stack hasGutter>
                  {allKeys.map((key) => {
                    const isSelected = ref.allKeys || ref.selectedKeys.includes(key);
                    return (
                      <StackItem key={key}>
                        <Checkbox
                          id={`${ref.secretName}-${key}`}
                          label={key}
                          isChecked={isSelected}
                          onChange={(_event, checked) =>
                            handleToggleKey(ref.secretName, key, checked)
                          }
                          data-testid={`secret-key-checkbox-${ref.secretName}-${key}`}
                        />
                      </StackItem>
                    );
                  })}
                  <StackItem>
                    <Button
                      variant="link"
                      isInline
                      onClick={() =>
                        onUpdate(
                          existingSecretRefs.map((r) =>
                            r.secretName === ref.secretName
                              ? { ...r, allKeys: false, selectedKeys: [] }
                              : r,
                          ),
                        )
                      }
                      data-testid={`deselect-all-keys-${ref.secretName}`}
                    >
                      Deselect all
                    </Button>
                  </StackItem>
                  {hasNoKeysSelected ? (
                    <StackItem>
                      <HelperText>
                        <HelperTextItem
                          variant="error"
                          data-testid={`no-keys-selected-${ref.secretName}`}
                        >
                          Select at least one key
                        </HelperTextItem>
                      </HelperText>
                    </StackItem>
                  ) : null}
                </Stack>
              </ExpandableSection>
            )}
          </StackItem>
        );
      })}

      <StackItem>
        <HelperText>
          <HelperTextItem variant="indeterminate" data-testid="existing-secret-helper-text">
            Environment variables are set at workbench start. If secret values change (e.g.,
            credential rotation), restart the workbench to pick up new values.
          </HelperTextItem>
        </HelperText>
      </StackItem>
    </Stack>
  );
};

export default ExistingSecretField;
