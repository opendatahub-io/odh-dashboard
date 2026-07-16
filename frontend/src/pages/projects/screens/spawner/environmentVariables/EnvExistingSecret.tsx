import * as React from 'react';
import {
  Badge,
  FormGroup,
  HelperText,
  HelperTextItem,
  MenuToggle,
  MenuToggleElement,
  // Multi-select typeahead with checkboxes is not supported by project wrappers
  // eslint-disable-next-line no-restricted-imports
  Select,
  SelectList,
  SelectOption,
  Spinner,
  Stack,
  StackItem,
  TextInputGroup,
  TextInputGroupMain,
  TextInputGroupUtilities,
  Button,
} from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons';
import type { SecretKind } from '@odh-dashboard/k8s-core';
import { ProjectDetailsContext } from '#~/pages/projects/ProjectDetailsContext';
import type { ExistingSecretRef } from '#~/pages/projects/types';
import type { EnvKeyCollision } from './existingSecretUtils';
import { useExistingSecrets } from './useExistingSecrets';
import ExistingSecretItem from './ExistingSecretItem';
import ExistingSecretCollisionAlert from './ExistingSecretCollisionAlert';

type EnvExistingSecretProps = {
  existingSecretRefs: ExistingSecretRef[];
  onUpdate: (refs: ExistingSecretRef[]) => void;
  collisions?: EnvKeyCollision[];
};

const EnvExistingSecret: React.FC<EnvExistingSecretProps> = ({
  existingSecretRefs,
  onUpdate,
  collisions = [],
}) => {
  const { currentProject } = React.useContext(ProjectDetailsContext);
  const namespace = currentProject.metadata.name;
  const [secrets, secretsLoaded, secretsError] = useExistingSecrets(namespace);
  const [isOpen, setIsOpen] = React.useState(false);
  const [filterValue, setFilterValue] = React.useState('');
  const textInputRef = React.useRef<HTMLInputElement>(null);

  const selectedNames = React.useMemo(
    () => new Set(existingSecretRefs.map((ref) => ref.secretName)),
    [existingSecretRefs],
  );

  const filteredSecrets = React.useMemo(
    () =>
      secrets.filter(
        (s) => !filterValue || s.metadata.name.toLowerCase().includes(filterValue.toLowerCase()),
      ),
    [secrets, filterValue],
  );

  const handleSelect = React.useCallback(
    (secret: SecretKind) => {
      const secretName = secret.metadata.name;
      if (selectedNames.has(secretName)) {
        onUpdate(existingSecretRefs.filter((ref) => ref.secretName !== secretName));
      } else {
        const availableKeys = secret.data ? Object.keys(secret.data) : [];
        const newRef: ExistingSecretRef = {
          secretName,
          allKeys: true,
          selectedKeys: [...availableKeys],
          availableKeys,
        };
        onUpdate([...existingSecretRefs, newRef]);
      }
    },
    [selectedNames, existingSecretRefs, onUpdate],
  );

  const handleRemove = React.useCallback(
    (secretName: string) => {
      onUpdate(existingSecretRefs.filter((ref) => ref.secretName !== secretName));
    },
    [existingSecretRefs, onUpdate],
  );

  const handleRefUpdate = React.useCallback(
    (index: number, updatedRef: ExistingSecretRef) => {
      onUpdate(existingSecretRefs.map((ref, i) => (i === index ? updatedRef : ref)));
    },
    [existingSecretRefs, onUpdate],
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
          autoComplete="off"
          innerRef={textInputRef}
          placeholder={
            selectedNames.size > 0
              ? `${selectedNames.size} secret${selectedNames.size > 1 ? 's' : ''} selected`
              : 'Select secrets...'
          }
          role="combobox"
          aria-controls="existing-secret-select-listbox"
          data-testid="existing-secret-typeahead-input"
        />
        <TextInputGroupUtilities>
          {selectedNames.size > 0 && (
            <Badge isRead data-testid="existing-secret-count-badge">
              {selectedNames.size}
            </Badge>
          )}
          {filterValue && (
            <Button
              variant="plain"
              onClick={() => setFilterValue('')}
              aria-label="Clear filter"
              data-testid="existing-secret-clear-filter"
            >
              <TimesIcon />
            </Button>
          )}
        </TextInputGroupUtilities>
      </TextInputGroup>
    </MenuToggle>
  );

  return (
    <Stack hasGutter data-testid="existing-secret-section">
      <StackItem>
        <FormGroup label="Secrets" isRequired fieldId="existing-secret-select">
          {!secretsLoaded ? (
            <Spinner size="md" data-testid="existing-secret-loading" />
          ) : secretsError ? (
            <HelperText>
              <HelperTextItem variant="error" data-testid="existing-secret-error">
                Failed to load secrets: {secretsError.message}
              </HelperTextItem>
            </HelperText>
          ) : secrets.length === 0 ? (
            <HelperText>
              <HelperTextItem variant="indeterminate" data-testid="existing-secret-empty">
                Your project may already have secrets, but they may be managed by Connections or
                created by other workbenches. New secrets can be added by your platform team using
                tools like External Secrets Operator, or you can create one using the Key / value
                option above.
              </HelperTextItem>
            </HelperText>
          ) : (
            <Select
              id="existing-secret-select-listbox"
              isOpen={isOpen}
              onOpenChange={(open) => setIsOpen(open)}
              toggle={toggle}
              onSelect={(_event, value) => {
                const selected = secrets.find((s) => s.metadata.name === value);
                if (selected) {
                  handleSelect(selected);
                }
              }}
              data-testid="existing-secret-select"
            >
              <SelectList>
                {filteredSecrets.map((secret) => (
                  <SelectOption
                    key={secret.metadata.name}
                    value={secret.metadata.name}
                    hasCheckbox
                    isSelected={selectedNames.has(secret.metadata.name)}
                    data-testid={`existing-secret-option-${secret.metadata.name}`}
                  >
                    {secret.metadata.name}
                  </SelectOption>
                ))}
                {filteredSecrets.length === 0 && (
                  <SelectOption isDisabled>No secrets match the filter</SelectOption>
                )}
              </SelectList>
            </Select>
          )}
        </FormGroup>
      </StackItem>

      {collisions.length > 0 && (
        <StackItem>
          <ExistingSecretCollisionAlert collisions={collisions} />
        </StackItem>
      )}

      {existingSecretRefs.length > 0 && (
        <StackItem>
          <Stack hasGutter>
            {existingSecretRefs.map((ref, index) => (
              <StackItem key={ref.secretName}>
                <ExistingSecretItem
                  secretRef={ref}
                  onUpdate={(updatedRef) => handleRefUpdate(index, updatedRef)}
                  onRemove={() => handleRemove(ref.secretName)}
                />
              </StackItem>
            ))}
          </Stack>
        </StackItem>
      )}

      <StackItem>
        <HelperText>
          <HelperTextItem data-testid="existing-secret-helper-text">
            Environment variables are set at workbench start. If secret values change (e.g.,
            credential rotation), restart the workbench to pick up new values.
          </HelperTextItem>
        </HelperText>
      </StackItem>
    </Stack>
  );
};

export default EnvExistingSecret;
