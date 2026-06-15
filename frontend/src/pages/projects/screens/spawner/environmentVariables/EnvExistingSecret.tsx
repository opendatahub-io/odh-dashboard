import * as React from 'react';
import {
  Alert,
  Button,
  Checkbox,
  FormGroup,
  HelperText,
  HelperTextItem,
  Label,
  Spinner,
  Split,
  SplitItem,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { MinusCircleIcon } from '@patternfly/react-icons';
import TypeaheadSelect, { TypeaheadSelectOption } from '#~/components/TypeaheadSelect';
import { getDashboardMainContainer } from '#~/utilities/utils';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import IndentSection from '#~/pages/projects/components/IndentSection';
import { ExistingSecretRef } from '#~/pages/projects/types';
import { useExistingSecrets, useListSecretsAllowed } from './useExistingSecrets';

type EnvExistingSecretProps = {
  instanceId: number;
  existingSecretRefs?: ExistingSecretRef[];
  onUpdate: (refs: ExistingSecretRef[]) => void;
};

const popperProps = { appendTo: getDashboardMainContainer };

const DESCRIPTION_TEXT =
  'Attach an available secret from this project. Use existing secrets for credentials ' +
  'managed by your platform team or provisioned through external tools (e.g., External ' +
  'Secrets Operator, GitOps). For reusable credentials like S3 or database connections, ' +
  'use the Connections section instead.';

const RESTART_INFO =
  'Environment variables are set at workbench start. If secret values change ' +
  '(e.g., credential rotation), restart the workbench to pick up new values.';

const EnvExistingSecret: React.FC<EnvExistingSecretProps> = ({
  instanceId,
  existingSecretRefs = [],
  onUpdate,
}) => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const namespace = currentProject.metadata.name;
  const [canListSecrets, rbacLoaded] = useListSecretsAllowed(namespace);
  const [secrets, secretsLoaded] = useExistingSecrets(canListSecrets ? namespace : undefined);

  const selectedNames = React.useMemo(
    () => new Set(existingSecretRefs.map((r) => r.secretName)),
    [existingSecretRefs],
  );

  const availableOptions = React.useMemo<TypeaheadSelectOption[]>(
    () =>
      secrets
        .filter((s) => !selectedNames.has(s.name))
        .map((s) => ({
          value: s.name,
          content: s.name,
          description: `${s.keys.length} key${s.keys.length !== 1 ? 's' : ''}`,
        })),
    [secrets, selectedNames],
  );

  const secretsByName = React.useMemo(() => new Map(secrets.map((s) => [s.name, s])), [secrets]);

  const handleAddSecret = React.useCallback(
    (
      _event: React.MouseEvent | React.KeyboardEvent<HTMLInputElement> | undefined,
      value: string | number,
    ) => {
      const name = String(value);
      const secret = secretsByName.get(name);
      const keys = secret?.keys ?? [];
      onUpdate([
        ...existingSecretRefs,
        { secretName: name, selectedKeys: keys, allKeys: keys.length > 0 },
      ]);
    },
    [secretsByName, existingSecretRefs, onUpdate],
  );

  const handleRemoveSecret = React.useCallback(
    (secretName: string) => {
      onUpdate(existingSecretRefs.filter((r) => r.secretName !== secretName));
    },
    [existingSecretRefs, onUpdate],
  );

  const handleAllKeysToggle = React.useCallback(
    (secretName: string, checked: boolean) => {
      const secret = secretsByName.get(secretName);
      const allKeys = secret?.keys ?? [];
      onUpdate(
        existingSecretRefs.map((r) =>
          r.secretName === secretName
            ? { ...r, allKeys: checked, selectedKeys: checked ? allKeys : [] }
            : r,
        ),
      );
    },
    [existingSecretRefs, secretsByName, onUpdate],
  );

  const handleKeyToggle = React.useCallback(
    (secretName: string, key: string, checked: boolean) => {
      const secret = secretsByName.get(secretName);
      const totalKeys = secret?.keys.length ?? 0;
      onUpdate(
        existingSecretRefs.map((r) => {
          if (r.secretName !== secretName) {
            return r;
          }
          const newKeys = checked
            ? [...r.selectedKeys, key]
            : r.selectedKeys.filter((k) => k !== key);
          return {
            ...r,
            selectedKeys: newKeys,
            allKeys: newKeys.length === totalKeys && newKeys.length > 0,
          };
        }),
      );
    },
    [existingSecretRefs, secretsByName, onUpdate],
  );

  const selectFieldId = `existing-secret-select-${instanceId}`;

  if (!rbacLoaded || (!secretsLoaded && canListSecrets)) {
    return <Spinner size="md" aria-label="Loading secrets" data-testid="existing-secret-spinner" />;
  }

  if (!canListSecrets) {
    return (
      <Alert
        variant="info"
        isInline
        isPlain
        title="You do not have permission to list secrets in this project"
        data-testid="existing-secret-no-permission"
      />
    );
  }

  return (
    <Stack hasGutter data-testid="env-existing-secret">
      <StackItem>
        <HelperText>
          <HelperTextItem>{DESCRIPTION_TEXT}</HelperTextItem>
        </HelperText>
      </StackItem>
      <StackItem>
        <FormGroup label="Add secret" fieldId={selectFieldId}>
          <TypeaheadSelect
            selectOptions={availableOptions}
            onSelect={handleAddSecret}
            placeholder={
              availableOptions.length > 0 ? 'Select a secret to add' : 'No more secrets available'
            }
            noOptionsAvailableMessage="No secrets available in this project"
            noOptionsFoundMessage={(filter) => `No secrets found for "${filter}"`}
            popperProps={popperProps}
            dataTestId={selectFieldId}
            isRequired={false}
            previewDescription
          />
        </FormGroup>
      </StackItem>
      {existingSecretRefs.map((ref) => {
        const secret = secretsByName.get(ref.secretName);
        const keys = secret?.keys ?? [];
        const allKeysId = `existing-secret-${instanceId}-${ref.secretName}-all-keys`;

        return (
          <StackItem key={ref.secretName} data-testid={`existing-secret-row-${ref.secretName}`}>
            <IndentSection>
              <Stack hasGutter>
                <StackItem>
                  <Split hasGutter>
                    <SplitItem isFilled>
                      <b>{ref.secretName}</b>{' '}
                      <Label isCompact>
                        {ref.selectedKeys.length} of {keys.length} keys
                      </Label>
                    </SplitItem>
                    <SplitItem>
                      <Button
                        variant="plain"
                        aria-label={`Remove secret ${ref.secretName}`}
                        data-testid={`remove-existing-secret-${ref.secretName}`}
                        icon={<MinusCircleIcon />}
                        onClick={() => handleRemoveSecret(ref.secretName)}
                      />
                    </SplitItem>
                  </Split>
                </StackItem>
                <StackItem>
                  <IndentSection>
                    <Stack>
                      <StackItem>
                        <Checkbox
                          id={allKeysId}
                          data-testid={allKeysId}
                          label="All keys"
                          isChecked={ref.allKeys}
                          onChange={(_e, checked) => handleAllKeysToggle(ref.secretName, checked)}
                        />
                      </StackItem>
                      {keys.map((key) => {
                        const keyId = `existing-secret-${instanceId}-${ref.secretName}-key-${key}`;
                        return (
                          <StackItem key={key}>
                            <Checkbox
                              id={keyId}
                              data-testid={keyId}
                              label={key}
                              isChecked={ref.selectedKeys.includes(key)}
                              onChange={(_e, checked) =>
                                handleKeyToggle(ref.secretName, key, checked)
                              }
                            />
                          </StackItem>
                        );
                      })}
                    </Stack>
                  </IndentSection>
                </StackItem>
              </Stack>
            </IndentSection>
          </StackItem>
        );
      })}
      {existingSecretRefs.length > 0 && (
        <StackItem>
          <HelperText>
            <HelperTextItem variant="indeterminate">{RESTART_INFO}</HelperTextItem>
          </HelperText>
        </StackItem>
      )}
    </Stack>
  );
};

export default EnvExistingSecret;
