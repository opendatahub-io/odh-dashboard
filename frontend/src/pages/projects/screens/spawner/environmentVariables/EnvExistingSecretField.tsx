import * as React from 'react';
import {
  Alert,
  Badge,
  Button,
  Content,
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
                  placeholder="Select secrets"
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
                <div>No results found.</div>
                <Content component="small" className="pf-v6-u-text-color-subtle">
                  Adjust your filter and try again.
                </Content>
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
            title="Resolve key name collisions"
            data-testid="env-collision-warning"
          >
            <p>
              The following keys are defined more than once across the selected secrets. To
              continue, deselect the duplicate keys in the key pickers below, or remove a secret
              containing the duplicate.
            </p>
            {collisions.map((c) => (
              <div key={c.key}>
                <strong>{c.key}</strong>
                <br />
                Defined in secrets: <strong>{c.sources.join(', ')}</strong>
              </div>
            ))}
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
