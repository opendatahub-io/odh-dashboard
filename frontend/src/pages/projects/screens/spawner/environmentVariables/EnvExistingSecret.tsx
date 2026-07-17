import * as React from 'react';
import {
  Badge,
  FormGroup,
  MenuToggle,
  MenuToggleElement,
  /**
   * The Select component is used to build another generic component here
   */
  // eslint-disable-next-line no-restricted-imports
  Select,
  SelectList,
  SelectOption,
  Stack,
  StackItem,
  TextInputGroup,
  TextInputGroupMain,
  TextInputGroupUtilities,
  Button,
} from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons';
import type { SecretKind } from '@odh-dashboard/k8s-core';
import { getSecret } from '#~/api';
import { Connection } from '#~/concepts/connectionTypes/types';
import { ExistingSecretRef, EnvVariable } from '#~/pages/projects/types';
import useExistingSecrets from './useExistingSecrets';
import ExistingSecretItem from './ExistingSecretItem';
import ExistingSecretCollisionAlert from './ExistingSecretCollisionAlert';
import { detectExistingSecretCollisions } from './existingSecretConflicts';

type EnvExistingSecretProps = {
  existingSecrets: ExistingSecretRef[];
  namespace: string;
  onUpdate: (secrets: ExistingSecretRef[]) => void;
  connections: Connection[];
  inlineEnvVars: EnvVariable[];
};

const EnvExistingSecret: React.FC<EnvExistingSecretProps> = ({
  existingSecrets,
  namespace,
  onUpdate,
  connections,
  inlineEnvVars,
}) => {
  const [availableSecrets, loaded, loadError] = useExistingSecrets(namespace, true);
  const [isOpen, setIsOpen] = React.useState(false);
  const [filterValue, setFilterValue] = React.useState('');
  const [secretStatuses, setSecretStatuses] = React.useState<
    Map<string, 'loaded' | 'not-found' | 'error'>
  >(new Map());

  const selectedNames = existingSecrets.map((s) => s.secretName);

  const filteredSecrets = React.useMemo(
    () =>
      availableSecrets.filter((s) =>
        filterValue ? s.metadata.name.toLowerCase().includes(filterValue.toLowerCase()) : true,
      ),
    [availableSecrets, filterValue],
  );

  const collisions = React.useMemo(
    () => detectExistingSecretCollisions(existingSecrets, inlineEnvVars, connections),
    [existingSecrets, inlineEnvVars, connections],
  );

  const fetchSecretKeys = React.useCallback(
    async (
      secretName: string,
    ): Promise<{ keys: string[]; status: 'loaded' | 'not-found' | 'error' }> => {
      try {
        const secret: SecretKind = await getSecret(namespace, secretName);
        const keys = secret.data ? Object.keys(secret.data) : [];
        return { keys, status: 'loaded' };
      } catch (e: unknown) {
        if (
          typeof e === 'object' &&
          e &&
          'statusObject' in e &&
          typeof e.statusObject === 'object' &&
          e.statusObject &&
          'code' in e.statusObject &&
          e.statusObject.code === 404
        ) {
          return { keys: [], status: 'not-found' };
        }
        return { keys: [], status: 'error' };
      }
    },
    [namespace],
  );

  const handleSelectSecret = React.useCallback(
    async (secretName: string) => {
      if (selectedNames.includes(secretName)) {
        onUpdate(existingSecrets.filter((s) => s.secretName !== secretName));
        setSecretStatuses((prev) => {
          const next = new Map(prev);
          next.delete(secretName);
          return next;
        });
      } else {
        const { keys, status } = await fetchSecretKeys(secretName);
        setSecretStatuses((prev) => new Map(prev).set(secretName, status));
        onUpdate([...existingSecrets, { secretName, selectedKeys: [...keys], allKeys: keys }]);
      }
    },
    [existingSecrets, selectedNames, fetchSecretKeys, onUpdate],
  );

  const handleUpdateKeys = React.useCallback(
    (secretName: string, newKeys: string[]) => {
      onUpdate(
        existingSecrets.map((s) =>
          s.secretName === secretName ? { ...s, selectedKeys: newKeys } : s,
        ),
      );
    },
    [existingSecrets, onUpdate],
  );

  const handleRemoveSecret = React.useCallback(
    (secretName: string) => {
      onUpdate(existingSecrets.filter((s) => s.secretName !== secretName));
      setSecretStatuses((prev) => {
        const next = new Map(prev);
        next.delete(secretName);
        return next;
      });
    },
    [existingSecrets, onUpdate],
  );

  const toggle = (toggleRef: React.Ref<MenuToggleElement>) => (
    <MenuToggle
      ref={toggleRef}
      variant="typeahead"
      onClick={() => setIsOpen((prev) => !prev)}
      isExpanded={isOpen}
      isFullWidth
      data-testid="existing-secret-select-toggle"
    >
      <TextInputGroup isPlain>
        <TextInputGroupMain
          value={filterValue}
          onClick={() => setIsOpen(true)}
          onChange={(_event, value) => setFilterValue(value)}
          placeholder={
            selectedNames.length > 0
              ? `${selectedNames.length} secret${selectedNames.length !== 1 ? 's' : ''} selected`
              : 'Select secrets'
          }
          data-testid="existing-secret-typeahead-input"
        />
        {selectedNames.length > 0 ? (
          <TextInputGroupUtilities>
            <Badge isRead data-testid="existing-secret-count-badge">
              {selectedNames.length} selected
            </Badge>
          </TextInputGroupUtilities>
        ) : null}
        {filterValue ? (
          <TextInputGroupUtilities>
            <Button
              variant="plain"
              aria-label="Clear filter"
              onClick={() => setFilterValue('')}
              icon={<TimesIcon />}
            />
          </TextInputGroupUtilities>
        ) : null}
      </TextInputGroup>
    </MenuToggle>
  );

  return (
    <Stack hasGutter>
      <StackItem>
        <FormGroup label="Secrets" isRequired fieldId="existing-secret-select">
          <Select
            id="existing-secret-select"
            isOpen={isOpen}
            onOpenChange={setIsOpen}
            onSelect={(_event, value) => {
              if (typeof value === 'string') {
                handleSelectSecret(value);
              }
            }}
            toggle={toggle}
            data-testid="existing-secret-select"
          >
            <SelectList data-testid="existing-secret-select-list">
              {loadError ? (
                <SelectOption isDisabled value="error" data-testid="existing-secret-error">
                  Error loading secrets
                </SelectOption>
              ) : !loaded ? (
                <SelectOption isDisabled value="loading" data-testid="existing-secret-loading">
                  Loading secrets...
                </SelectOption>
              ) : filteredSecrets.length === 0 ? (
                <SelectOption isDisabled value="empty" data-testid="existing-secret-empty">
                  {filterValue
                    ? 'No secrets match the filter'
                    : 'No eligible secrets in this project'}
                </SelectOption>
              ) : (
                filteredSecrets.map((secret) => (
                  <SelectOption
                    key={secret.metadata.name}
                    value={secret.metadata.name}
                    hasCheckbox
                    isSelected={selectedNames.includes(secret.metadata.name)}
                    data-testid={`existing-secret-option-${secret.metadata.name}`}
                  >
                    {secret.metadata.name}
                  </SelectOption>
                ))
              )}
            </SelectList>
          </Select>
        </FormGroup>
      </StackItem>
      {collisions.length > 0 ? (
        <StackItem>
          <ExistingSecretCollisionAlert collisions={collisions} />
        </StackItem>
      ) : null}
      {existingSecrets.map((secretRef) => (
        <StackItem key={secretRef.secretName}>
          <ExistingSecretItem
            secretRef={secretRef}
            secretStatus={secretStatuses.get(secretRef.secretName) || 'loaded'}
            onUpdateKeys={(newKeys) => handleUpdateKeys(secretRef.secretName, newKeys)}
            onRemove={() => handleRemoveSecret(secretRef.secretName)}
          />
        </StackItem>
      ))}
    </Stack>
  );
};

export default EnvExistingSecret;
