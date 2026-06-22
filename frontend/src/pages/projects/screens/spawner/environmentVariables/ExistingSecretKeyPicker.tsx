import * as React from 'react';
import {
  Badge,
  Button,
  Checkbox,
  Content,
  ExpandableSection,
  Flex,
  FlexItem,
  Stack,
  StackItem,
  TextInput,
} from '@patternfly/react-core';
import { ExistingSecretMetadata, ExistingSecretRef } from '#~/pages/projects/types';
import './ExistingSecretKeyPicker.scss';

const FILTER_THRESHOLD = 10;

type ExistingSecretKeyPickerProps = {
  selectedRefs: ExistingSecretRef[];
  availableSecrets: ExistingSecretMetadata[];
  onUpdate: (updatedRefs: ExistingSecretRef[]) => void;
};

type SecretKeySectionProps = {
  secretRef: ExistingSecretRef;
  allKeys: string[];
  onKeysChange: (selectedKeys: string[]) => void;
};

const SecretKeySection: React.FC<SecretKeySectionProps> = ({
  secretRef,
  allKeys,
  onKeysChange,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const [filter, setFilter] = React.useState('');

  const { selectedKeys } = secretRef;
  const totalKeys = allKeys.length;
  const allSelected = selectedKeys.length === totalKeys;

  const visibleKeys = React.useMemo(
    () =>
      filter ? allKeys.filter((k) => k.toLowerCase().includes(filter.toLowerCase())) : allKeys,
    [allKeys, filter],
  );

  const selectedSet = React.useMemo(() => new Set(selectedKeys), [selectedKeys]);

  const toggleSelectAll = () => {
    if (allSelected) {
      onKeysChange([]);
    } else {
      onKeysChange([...allKeys]);
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

  return (
    <div
      className="odh-existing-secret-key-picker__section pf-v6-u-pl-md pf-v6-u-ml-sm"
      data-testid={`secret-key-section-${secretRef.secretName}`}
    >
      <ExpandableSection
        toggleContent={
          <Flex gap={{ default: 'gapSm' }} alignItems={{ default: 'alignItemsCenter' }}>
            <FlexItem>
              <strong>{secretRef.secretName}</strong>
            </FlexItem>
            <FlexItem>
              <Badge isRead data-testid={`key-count-badge-${secretRef.secretName}`}>
                {selectedKeys.length} of {totalKeys} keys
              </Badge>
            </FlexItem>
          </Flex>
        }
        isExpanded={isExpanded}
        onToggle={(_event, expanded) => setIsExpanded(expanded)}
        data-testid={`expandable-section-${secretRef.secretName}`}
      >
        <Stack hasGutter>
          <StackItem>
            <Flex alignItems={{ default: 'alignItemsCenter' }} gap={{ default: 'gapSm' }}>
              <FlexItem>
                <Button
                  variant="link"
                  isInline
                  onClick={toggleSelectAll}
                  data-testid={`toggle-select-all-${secretRef.secretName}`}
                >
                  {allSelected ? 'Deselect all' : 'Select all'}
                </Button>
              </FlexItem>
              <FlexItem>
                <Content component="small" className="pf-v6-u-color-200">
                  {selectedKeys.length} of {totalKeys} keys selected
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
          {visibleKeys.map((k) => (
            <StackItem key={k}>
              <Checkbox
                id={`key-${entryId}-${k}`}
                label={k}
                isChecked={selectedSet.has(k)}
                onChange={(_event, checked) => toggleKey(k, checked)}
                data-testid={`key-checkbox-${secretRef.secretName}-${k}`}
              />
            </StackItem>
          ))}
        </Stack>
      </ExpandableSection>
    </div>
  );
};

const ExistingSecretKeyPicker: React.FC<ExistingSecretKeyPickerProps> = ({
  selectedRefs,
  availableSecrets,
  onUpdate,
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

  return (
    <Stack hasGutter data-testid="existing-secret-key-picker">
      {selectedRefs.map((ref) => {
        const secretMeta = secretMap.get(ref.secretName);
        if (!secretMeta) {
          return null;
        }
        return (
          <StackItem key={ref.secretName}>
            <SecretKeySection
              secretRef={ref}
              allKeys={secretMeta.keys}
              onKeysChange={(newKeys) => handleKeysChange(ref.secretName, newKeys)}
            />
          </StackItem>
        );
      })}
    </Stack>
  );
};

export default ExistingSecretKeyPicker;
