import * as React from 'react';
import {
  Alert,
  Button,
  Checkbox,
  ExpandableSection,
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
import { MultiSelection, SelectionOptions } from '#~/components/MultiSelection';
import { getDashboardMainContainer } from '#~/utilities/utils';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
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
  const [expandedSecrets, setExpandedSecrets] = React.useState<Set<string>>(new Set());

  const selectedNames = React.useMemo(
    () => new Set(existingSecretRefs.map((r) => r.secretName)),
    [existingSecretRefs],
  );

  const secretSelectionOptions = React.useMemo<SelectionOptions[]>(
    () =>
      secrets.map((s) => ({
        id: s.name,
        name: s.name,
        description: `${s.keys.length} key${s.keys.length !== 1 ? 's' : ''}`,
        selected: selectedNames.has(s.name),
      })),
    [secrets, selectedNames],
  );

  const secretsByName = React.useMemo(() => new Map(secrets.map((s) => [s.name, s])), [secrets]);

  const handleToggleExpanded = React.useCallback((secretName: string, isExpanded: boolean) => {
    setExpandedSecrets((prev) => {
      const next = new Set(prev);
      if (isExpanded) {
        next.add(secretName);
      } else {
        next.delete(secretName);
      }
      return next;
    });
  }, []);

  const handleSecretSelectionChange = React.useCallback(
    (options: SelectionOptions[]) => {
      const nowSelected = new Set(options.filter((o) => o.selected).map((o) => String(o.id)));
      const existingMap = new Map(existingSecretRefs.map((r) => [r.secretName, r]));

      const newRefs: ExistingSecretRef[] = [];
      for (const name of nowSelected) {
        const existing = existingMap.get(name);
        if (existing) {
          newRefs.push(existing);
        } else {
          const secret = secretsByName.get(name);
          const keys = secret?.keys ?? [];
          setExpandedSecrets((prev) => new Set(prev).add(name));
          newRefs.push({ secretName: name, selectedKeys: keys, allKeys: keys.length > 0 });
        }
      }
      onUpdate(newRefs);
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
      const shouldSelectAll = checked && allKeys.length > 0;
      onUpdate(
        existingSecretRefs.map((r) =>
          r.secretName === secretName
            ? { ...r, allKeys: shouldSelectAll, selectedKeys: shouldSelectAll ? allKeys : [] }
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
        <FormGroup
          label="Secrets"
          fieldId={selectFieldId}
          isRequired={existingSecretRefs.length > 0}
        >
          <MultiSelection
            id={selectFieldId}
            toggleId={selectFieldId}
            toggleTestId={selectFieldId}
            ariaLabel="Select secrets"
            placeholder={
              existingSecretRefs.length > 0
                ? `${existingSecretRefs.length} secret${
                    existingSecretRefs.length !== 1 ? 's' : ''
                  } selected`
                : 'Select secrets'
            }
            value={secretSelectionOptions}
            setValue={handleSecretSelectionChange}
            hasCheckbox
            isScrollable
            popperProps={popperProps}
          />
        </FormGroup>
      </StackItem>
      {existingSecretRefs.map((ref) => {
        const secret = secretsByName.get(ref.secretName);
        const keys = secret?.keys ?? [];
        const allKeysId = `existing-secret-${instanceId}-${ref.secretName}-all-keys`;
        const isExpanded = expandedSecrets.has(ref.secretName);

        return (
          <StackItem key={ref.secretName} data-testid={`existing-secret-row-${ref.secretName}`}>
            <Split>
              <SplitItem isFilled>
                <ExpandableSection
                  toggleContent={
                    <>
                      <b>{ref.secretName}</b>{' '}
                      <Label isCompact>
                        {ref.selectedKeys.length} of {keys.length} key
                        {keys.length !== 1 ? 's' : ''}
                      </Label>
                    </>
                  }
                  isExpanded={isExpanded}
                  onToggle={(_e, expanded) => handleToggleExpanded(ref.secretName, expanded)}
                  isIndented
                >
                  <Stack hasGutter>
                    <StackItem>
                      <Button
                        variant="link"
                        isInline
                        data-testid={allKeysId}
                        onClick={() => handleAllKeysToggle(ref.secretName, !ref.allKeys)}
                      >
                        {ref.allKeys ? 'Deselect all' : 'Select all'}
                      </Button>
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
                </ExpandableSection>
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
        );
      })}
      {existingSecretRefs.length > 0 && (
        <StackItem>
          <HelperText>
            <HelperTextItem>{RESTART_INFO}</HelperTextItem>
          </HelperText>
        </StackItem>
      )}
    </Stack>
  );
};

export default EnvExistingSecret;
