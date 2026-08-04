import * as React from 'react';
import {
  Alert,
  Badge,
  Button,
  Content,
  ContentVariants,
  FormGroup,
  MenuToggle,
  MenuToggleElement,
  // eslint-disable-next-line no-restricted-imports -- typeahead multi-select requires Select directly
  Select,
  SelectList,
  SelectOption,
  Stack,
  StackItem,
  TextInputGroup,
  TextInputGroupMain,
  TextInputGroupUtilities,
} from '@patternfly/react-core';
import { TimesIcon } from '@patternfly/react-icons';
import { ExistingSecretRef, ExistingSecretMetadata } from '#~/pages/projects/types';
import { UseExistingSecretsResult } from './useExistingSecrets';
import ExistingSecretKeyPicker from './ExistingSecretKeyPicker';
import { detectExistingSecretKeyCollisions, getCollidingKeySet } from './existingSecretCollisions';

type EnvExistingSecretFieldProps = {
  existingSecretRefs: ExistingSecretRef[];
  onUpdate: (refs: ExistingSecretRef[]) => void;
  usedSecretNames?: Set<string>;
  inlineKeyNames?: Set<string>;
  existingSecretsData: UseExistingSecretsResult;
};

const MAX_KEY_PREVIEW_LENGTH = 60;

const getKeyPreview = (keys: string[]): string => {
  if (keys.length === 0) {
    return '';
  }
  const preview = keys.join(', ');
  if (preview.length <= MAX_KEY_PREVIEW_LENGTH) {
    return preview;
  }
  return `${preview.substring(0, MAX_KEY_PREVIEW_LENGTH)}...`;
};

const EnvExistingSecretField: React.FC<EnvExistingSecretFieldProps> = ({
  existingSecretRefs,
  onUpdate,
  usedSecretNames = new Set(),
  inlineKeyNames = new Set(),
  existingSecretsData,
}) => {
  const { secrets } = existingSecretsData;
  const [isOpen, setIsOpen] = React.useState(false);
  const [searchText, setSearchText] = React.useState('');
  const textInputRef = React.useRef<HTMLInputElement>();

  React.useEffect(() => {
    if (isOpen) {
      requestAnimationFrame(() => textInputRef.current?.focus());
    }
  }, [isOpen]);

  const selectedSecretNames = React.useMemo(
    () => new Set(existingSecretRefs.map((ref) => ref.secretName)),
    [existingSecretRefs],
  );

  const filteredSecrets = React.useMemo(
    () =>
      searchText
        ? secrets.filter((s) => s.name.toLowerCase().includes(searchText.toLowerCase()))
        : secrets,
    [secrets, searchText],
  );

  const handleSelect = React.useCallback(
    (_event: React.MouseEvent | undefined, value: string | number | undefined) => {
      const secretName = String(value);
      if (selectedSecretNames.has(secretName)) {
        onUpdate(existingSecretRefs.filter((ref) => ref.secretName !== secretName));
      } else {
        const secret = secrets.find((s) => s.name === secretName);
        if (secret) {
          onUpdate([
            ...existingSecretRefs,
            { secretName: secret.name, selectedKeys: [...secret.keys] },
          ]);
        }
      }
    },
    [selectedSecretNames, existingSecretRefs, onUpdate, secrets],
  );

  const handleClearSearch = React.useCallback(() => {
    setSearchText('');
    textInputRef.current?.focus();
  }, []);

  const handleOpenChange = React.useCallback((open: boolean) => {
    setIsOpen(open);
    if (!open) {
      setSearchText('');
    }
  }, []);

  const handleTextInputChange = React.useCallback(
    (_event: React.FormEvent<HTMLInputElement>, value: string) => {
      setSearchText(value);
      if (!isOpen) {
        setIsOpen(true);
      }
    },
    [isOpen],
  );

  const collisions = React.useMemo(
    () => detectExistingSecretKeyCollisions(existingSecretRefs, inlineKeyNames),
    [existingSecretRefs, inlineKeyNames],
  );

  const collidingKeySet = React.useMemo(() => getCollidingKeySet(collisions), [collisions]);

  const availableSecrets = secrets.filter((s) => !usedSecretNames.has(s.name));
  const hasSecrets = availableSecrets.length > 0;

  if (!hasSecrets && secrets.length > 0 && existingSecretRefs.length === 0) {
    return (
      <FormGroup label="Existing secrets" data-testid="env-existing-secret-field">
        <Content component={ContentVariants.small} data-testid="env-existing-secret-all-used">
          All secrets in this project are already attached in other variables.
        </Content>
      </FormGroup>
    );
  }

  const selectedCount = existingSecretRefs.length;

  return (
    <Stack hasGutter>
      <StackItem data-testid="env-existing-secret-field">
        <Select
          isOpen={isOpen}
          selected={Array.from(selectedSecretNames)}
          isScrollable
          onSelect={handleSelect}
          onOpenChange={handleOpenChange}
          toggle={(toggleRef: React.Ref<MenuToggleElement>) => (
            <MenuToggle
              ref={toggleRef}
              variant="typeahead"
              onClick={() => setIsOpen(!isOpen)}
              isExpanded={isOpen}
              isFullWidth
              data-testid="env-existing-secret-toggle"
            >
              <TextInputGroup isPlain>
                <TextInputGroupMain
                  value={searchText}
                  onClick={() => {
                    setIsOpen(!isOpen);
                  }}
                  onChange={handleTextInputChange}
                  autoComplete="off"
                  innerRef={textInputRef}
                  placeholder="Search secrets"
                  role="combobox"
                  isExpanded={isOpen}
                  data-testid="env-existing-secret-search"
                />
                <TextInputGroupUtilities>
                  {selectedCount > 0 ? (
                    <Badge isRead data-testid="env-existing-secret-badge">
                      {selectedCount} selected
                    </Badge>
                  ) : null}
                  {searchText ? (
                    <Button
                      variant="plain"
                      onClick={handleClearSearch}
                      aria-label="Clear search"
                      icon={<TimesIcon />}
                      data-testid="env-existing-secret-clear-search"
                    />
                  ) : null}
                </TextInputGroupUtilities>
              </TextInputGroup>
            </MenuToggle>
          )}
        >
          <SelectList data-testid="env-existing-secret-list">
            {filteredSecrets.length === 0 ? (
              <SelectOption isDisabled data-testid="env-existing-secret-no-results">
                No results found. Adjust your filter and try again.
              </SelectOption>
            ) : (
              filteredSecrets.map((secret: ExistingSecretMetadata) => {
                const isUsedElsewhere = usedSecretNames.has(secret.name);
                return (
                  <SelectOption
                    key={secret.name}
                    value={secret.name}
                    hasCheckbox
                    isSelected={selectedSecretNames.has(secret.name)}
                    isDisabled={isUsedElsewhere}
                    description={
                      isUsedElsewhere
                        ? 'Already attached in another variable'
                        : `${secret.keys.length} key${
                            secret.keys.length !== 1 ? 's' : ''
                          }: ${getKeyPreview(secret.keys)}`
                    }
                    data-testid={`env-existing-secret-option-${secret.name}`}
                  >
                    {secret.name}
                  </SelectOption>
                );
              })
            )}
          </SelectList>
        </Select>
      </StackItem>
      {collisions.length > 0 ? (
        <StackItem>
          <Alert
            variant="warning"
            isInline
            isPlain
            title={
              collisions.length === 1
                ? `${collisions[0].key} is defined in both ${collisions[0].sources.join(' and ')}.`
                : 'Key name collisions across attached secrets'
            }
            data-testid="env-collision-warning"
          >
            <p>Choose one and deselect the duplicate key to resolve the collision.</p>
            {collisions.length > 1
              ? collisions.map((c) => (
                  <div key={c.key}>
                    <strong>{c.key}</strong> is defined in both {c.sources.join(' and ')}.
                  </div>
                ))
              : null}
          </Alert>
        </StackItem>
      ) : null}
      {existingSecretRefs.length > 0 ? (
        <StackItem>
          <ExistingSecretKeyPicker
            selectedRefs={existingSecretRefs}
            availableSecrets={secrets}
            onUpdate={onUpdate}
            collidingKeys={collidingKeySet}
          />
        </StackItem>
      ) : null}
    </Stack>
  );
};

export default EnvExistingSecretField;
