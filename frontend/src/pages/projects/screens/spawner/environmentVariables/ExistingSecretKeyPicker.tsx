import * as React from 'react';
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  Content,
  ExpandableSection,
  Flex,
  FlexItem,
  Icon,
  Stack,
  StackItem,
  TextInput,
  Tooltip,
} from '@patternfly/react-core';
import { ExclamationCircleIcon, ExclamationTriangleIcon } from '@patternfly/react-icons';
import { ExistingSecretMetadata, ExistingSecretRef } from '#~/pages/projects/types';
import { isValidEnvVarName, RESERVED_ENV_NAMES } from '#~/pages/projects/screens/spawner/service';
import './ExistingSecretKeyPicker.scss';

const FILTER_THRESHOLD = 10;

type ExistingSecretKeyPickerProps = {
  selectedRefs: ExistingSecretRef[];
  availableSecrets: ExistingSecretMetadata[];
  onUpdate: (updatedRefs: ExistingSecretRef[]) => void;
  collidingKeys?: Set<string>;
};

type SecretKeySectionProps = {
  secretRef: ExistingSecretRef;
  allKeys: string[];
  isDeleted: boolean;
  missingKeys: string[];
  collidingKeys: Set<string>;
  onKeysChange: (selectedKeys: string[]) => void;
  onRemoveRef: () => void;
  onRemoveMissingKeys: (keys: string[]) => void;
};

const SecretKeySection: React.FC<SecretKeySectionProps> = ({
  secretRef,
  allKeys,
  isDeleted,
  missingKeys,
  collidingKeys,
  onKeysChange,
  onRemoveRef,
  onRemoveMissingKeys,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(isDeleted || missingKeys.length > 0);
  const [filter, setFilter] = React.useState('');

  const { selectedKeys } = secretRef;
  const selectableKeys = allKeys.filter((k) => isValidEnvVarName(k) && !RESERVED_ENV_NAMES.has(k));
  const totalSelectableKeys = selectableKeys.length;
  const totalKeys = allKeys.length;
  const hasMissingKeys = missingKeys.length > 0;

  const visibleKeys = React.useMemo(
    () =>
      filter ? allKeys.filter((k) => k.toLowerCase().includes(filter.toLowerCase())) : allKeys,
    [allKeys, filter],
  );

  const selectedSet = React.useMemo(() => new Set(selectedKeys), [selectedKeys]);

  const visibleSelectableKeys = React.useMemo(
    () => visibleKeys.filter((k) => isValidEnvVarName(k) && !RESERVED_ENV_NAMES.has(k)),
    [visibleKeys],
  );

  const actualSelectedCount = selectedKeys.filter((k) => selectableKeys.includes(k)).length;
  const allSelected =
    !isDeleted && totalSelectableKeys > 0 && actualSelectedCount === totalSelectableKeys;
  const allVisibleSelected =
    !isDeleted &&
    visibleSelectableKeys.length > 0 &&
    visibleSelectableKeys.every((k) => selectedSet.has(k));

  const toggleSelectAll = () => {
    const shouldDeselect = filter ? allVisibleSelected : allSelected;
    if (shouldDeselect) {
      const visibleSet = new Set(visibleSelectableKeys);
      onKeysChange(selectedKeys.filter((k) => !visibleSet.has(k)));
    } else {
      const alreadySelected = new Set(selectedKeys);
      const merged = [
        ...selectedKeys,
        ...visibleSelectableKeys.filter((k) => !alreadySelected.has(k)),
      ];
      onKeysChange(merged);
    }
  };

  const toggleKey = (key: string, checked: boolean) => {
    if (checked) {
      onKeysChange([...selectedKeys, key]);
    } else {
      onKeysChange(selectedKeys.filter((k) => k !== key));
    }
  };

  const entryId = secretRef.secretName.replace(/[^a-zA-Z0-9-_]/g, '-');

  const toggleContent = (
    <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
      <FlexItem>
        <strong>{secretRef.secretName}</strong>
      </FlexItem>
      {isDeleted ? (
        <FlexItem>
          <Tooltip content="This secret was not found.">
            <Icon isInline status="danger" data-testid={`deleted-icon-${secretRef.secretName}`}>
              <ExclamationCircleIcon />
            </Icon>
          </Tooltip>
        </FlexItem>
      ) : null}
      {!isDeleted && hasMissingKeys ? (
        <FlexItem>
          <Tooltip content="Missing keys detected">
            <Icon
              isInline
              status="warning"
              data-testid={`missing-keys-icon-${secretRef.secretName}`}
            >
              <ExclamationTriangleIcon />
            </Icon>
          </Tooltip>
        </FlexItem>
      ) : null}
      {!isDeleted ? (
        <FlexItem>
          <Badge isRead data-testid={`key-count-badge-${secretRef.secretName}`}>
            {actualSelectedCount} of {totalSelectableKeys} keys
          </Badge>
        </FlexItem>
      ) : null}
    </Flex>
  );

  return (
    <div
      className="odh-existing-secret-key-picker__section pf-v6-u-pl-md pf-v6-u-ml-sm"
      data-testid={`secret-key-section-${secretRef.secretName}`}
    >
      <ExpandableSection
        toggleContent={toggleContent}
        isExpanded={isExpanded}
        onToggle={(_event, expanded) => setIsExpanded(expanded)}
        data-testid={`expandable-section-${secretRef.secretName}`}
      >
        <Stack hasGutter>
          {isDeleted ? (
            <StackItem>
              <Alert
                variant="danger"
                isInline
                isPlain
                title="This secret was not found. This workbench cannot start until the missing secret is restored or removed."
                actionLinks={
                  <Button
                    variant="link"
                    isInline
                    onClick={onRemoveRef}
                    data-testid={`remove-deleted-ref-${secretRef.secretName}`}
                  >
                    Remove this reference
                  </Button>
                }
                data-testid={`env-deleted-secret-alert-${secretRef.secretName}`}
              />
            </StackItem>
          ) : null}
          {!isDeleted && hasMissingKeys ? (
            <StackItem>
              <Alert
                variant="warning"
                isInline
                isPlain
                title={`${missingKeys.length} previously selected key${
                  missingKeys.length > 1 ? 's were' : ' was'
                } not found in this secret`}
                actionLinks={
                  <Button
                    variant="link"
                    isInline
                    onClick={() => onRemoveMissingKeys(missingKeys)}
                    data-testid={`remove-missing-keys-${secretRef.secretName}`}
                  >
                    Remove missing keys
                  </Button>
                }
                data-testid={`env-missing-keys-alert-${secretRef.secretName}`}
              >
                <p>
                  Missing: {missingKeys.join(', ')}. These keys may have been renamed or removed.
                  Remove missing keys to prevent the workbench from failing to start.
                </p>
              </Alert>
            </StackItem>
          ) : null}
          {!isDeleted ? (
            <>
              <StackItem>
                <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
                  <FlexItem>
                    <Button
                      variant="link"
                      isInline
                      onClick={toggleSelectAll}
                      data-testid={`toggle-select-all-${secretRef.secretName}`}
                    >
                      {(filter ? allVisibleSelected : allSelected) ? 'Deselect all' : 'Select all'}
                    </Button>
                  </FlexItem>
                  <FlexItem>
                    <Content component="small" className="pf-v6-u-text-color-subtle">
                      {actualSelectedCount} of {totalSelectableKeys} keys selected
                    </Content>
                  </FlexItem>
                </Flex>
              </StackItem>
              {totalKeys > FILTER_THRESHOLD ? (
                <StackItem>
                  <TextInput
                    type="search"
                    placeholder="Filter keys"
                    value={filter}
                    onChange={(_event, value) => setFilter(value)}
                    aria-label={`Filter keys for ${secretRef.secretName}`}
                    data-testid={`key-filter-${secretRef.secretName}`}
                  />
                </StackItem>
              ) : null}
              {visibleKeys.length === 0 && filter ? (
                <StackItem>
                  <Content component="small" className="pf-v6-u-text-color-subtle">
                    No results found. Adjust your filter and try again.
                  </Content>
                </StackItem>
              ) : null}
              {visibleKeys.map((k) => {
                const isColliding = collidingKeys.has(k);
                const isInvalidName = !isValidEnvVarName(k);
                const isReserved = RESERVED_ENV_NAMES.has(k);
                const isKeyDisabled = isInvalidName || isReserved;
                return (
                  <StackItem key={k}>
                    <Checkbox
                      id={`key-${entryId}-${k}`}
                      label={
                        <Flex
                          gap={{ default: 'gapSm' }}
                          alignItems={{ default: 'alignItemsCenter' }}
                          display={{ default: 'inlineFlex' }}
                        >
                          <FlexItem>{k}</FlexItem>
                          {isColliding ? (
                            <FlexItem>
                              <Tooltip content="This key is defined in multiple secrets">
                                <Icon
                                  isInline
                                  status="warning"
                                  data-testid={`collision-icon-${secretRef.secretName}-${k}`}
                                >
                                  <ExclamationTriangleIcon />
                                </Icon>
                              </Tooltip>
                            </FlexItem>
                          ) : null}
                          {isReserved ? (
                            <FlexItem>
                              <Tooltip content="This key conflicts with a system environment variable managed by the dashboard">
                                <Icon isInline status="danger">
                                  <ExclamationCircleIcon />
                                </Icon>
                              </Tooltip>
                            </FlexItem>
                          ) : isInvalidName ? (
                            <FlexItem>
                              <Tooltip content="This key cannot be used as an environment variable name (contains invalid characters)">
                                <Icon isInline status="danger">
                                  <ExclamationCircleIcon />
                                </Icon>
                              </Tooltip>
                            </FlexItem>
                          ) : null}
                        </Flex>
                      }
                      isChecked={selectedSet.has(k) && !isKeyDisabled}
                      isDisabled={isKeyDisabled}
                      onChange={(_event, checked) => toggleKey(k, checked)}
                      data-testid={`key-checkbox-${secretRef.secretName}-${k}`}
                    />
                  </StackItem>
                );
              })}
            </>
          ) : null}
        </Stack>
      </ExpandableSection>
    </div>
  );
};

const ExistingSecretKeyPicker: React.FC<ExistingSecretKeyPickerProps> = ({
  selectedRefs,
  availableSecrets,
  onUpdate,
  collidingKeys = new Set<string>(),
}) => {
  const secretMap = React.useMemo(() => {
    const map = new Map<string, ExistingSecretMetadata>();
    availableSecrets.forEach((s) => map.set(s.name, s));
    return map;
  }, [availableSecrets]);

  const handleKeysChange = React.useCallback(
    (secretName: string, newKeys: string[]) => {
      onUpdate(
        selectedRefs.map((ref) =>
          ref.secretName === secretName ? { ...ref, selectedKeys: newKeys } : ref,
        ),
      );
    },
    [selectedRefs, onUpdate],
  );

  const handleRemoveRef = React.useCallback(
    (secretName: string) => {
      onUpdate(selectedRefs.filter((ref) => ref.secretName !== secretName));
    },
    [selectedRefs, onUpdate],
  );

  const handleRemoveMissingKeys = React.useCallback(
    (secretName: string, missingKeysList: string[]) => {
      const missingSet = new Set(missingKeysList);
      onUpdate(
        selectedRefs.map((ref) =>
          ref.secretName === secretName
            ? { ...ref, selectedKeys: ref.selectedKeys.filter((k) => !missingSet.has(k)) }
            : ref,
        ),
      );
    },
    [selectedRefs, onUpdate],
  );

  return (
    <Stack hasGutter data-testid="existing-secret-key-picker">
      {selectedRefs.map((ref) => {
        const secretMeta = secretMap.get(ref.secretName);
        const isDeleted = !secretMeta;
        const allKeys = secretMeta?.keys ?? [];

        // Detect missing keys: keys in selectedKeys that are not in the secret's actual keys
        const actualKeySet = new Set(allKeys);
        const missingKeys = ref.selectedKeys.filter((k) => !actualKeySet.has(k));

        return (
          <StackItem key={ref.secretName}>
            <SecretKeySection
              secretRef={ref}
              allKeys={allKeys}
              isDeleted={isDeleted}
              missingKeys={missingKeys}
              collidingKeys={collidingKeys}
              onKeysChange={(newKeys) => handleKeysChange(ref.secretName, newKeys)}
              onRemoveRef={() => handleRemoveRef(ref.secretName)}
              onRemoveMissingKeys={(keys) => handleRemoveMissingKeys(ref.secretName, keys)}
            />
          </StackItem>
        );
      })}
    </Stack>
  );
};

export default ExistingSecretKeyPicker;
