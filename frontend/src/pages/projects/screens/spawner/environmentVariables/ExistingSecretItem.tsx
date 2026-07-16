import * as React from 'react';
import {
  Alert,
  Badge,
  Button,
  Checkbox,
  ExpandableSection,
  Flex,
  FlexItem,
  Icon,
  Stack,
  StackItem,
} from '@patternfly/react-core';
import { ExclamationCircleIcon, ExclamationTriangleIcon } from '@patternfly/react-icons';
import type { ExistingSecretRef } from '#~/pages/projects/types';

type ExistingSecretItemProps = {
  secretRef: ExistingSecretRef;
  onUpdate: (ref: ExistingSecretRef) => void;
  onRemove: () => void;
};

const ExistingSecretItem: React.FC<ExistingSecretItemProps> = ({
  secretRef,
  onUpdate,
  onRemove,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(!!secretRef.error || !!secretRef.missingKeys);
  const { secretName, selectedKeys, availableKeys, allKeys, error, missingKeys } = secretRef;
  const selectedCount = selectedKeys.length;
  const totalCount = availableKeys.length;

  const badgeContent = error ? '0 of 0 keys' : `${selectedCount} of ${totalCount} keys`;

  const badgeIcon = error ? (
    <Icon status="danger">
      <ExclamationCircleIcon />
    </Icon>
  ) : missingKeys && missingKeys.length > 0 ? (
    <Icon status="warning">
      <ExclamationTriangleIcon />
    </Icon>
  ) : null;

  const handleKeyToggle = (key: string, checked: boolean) => {
    const newSelectedKeys = checked
      ? [...selectedKeys, key]
      : selectedKeys.filter((k) => k !== key);
    onUpdate({
      ...secretRef,
      selectedKeys: newSelectedKeys,
      allKeys:
        newSelectedKeys.length === availableKeys.length &&
        availableKeys.every((k) => newSelectedKeys.includes(k)),
    });
  };

  const handleSelectAll = () => {
    onUpdate({
      ...secretRef,
      selectedKeys: [...availableKeys],
      allKeys: true,
    });
  };

  const handleDeselectAll = () => {
    onUpdate({
      ...secretRef,
      selectedKeys: [],
      allKeys: false,
    });
  };

  const handleRemoveMissingKeys = () => {
    if (!missingKeys) {
      return;
    }
    const cleanedKeys = selectedKeys.filter((k) => !missingKeys.includes(k));
    onUpdate({
      ...secretRef,
      selectedKeys: cleanedKeys,
      missingKeys: undefined,
      allKeys:
        cleanedKeys.length === availableKeys.length &&
        availableKeys.every((k) => cleanedKeys.includes(k)),
    });
  };

  const toggleContent = (
    <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
      <FlexItem>{secretName}</FlexItem>
      <FlexItem>
        <Flex spaceItems={{ default: 'spaceItemsXs' }} alignItems={{ default: 'alignItemsCenter' }}>
          {badgeIcon}
          <FlexItem>
            <Badge isRead>{badgeContent}</Badge>
          </FlexItem>
        </Flex>
      </FlexItem>
    </Flex>
  );

  return (
    <div data-testid={`existing-secret-item-${secretName}`}>
      <ExpandableSection
        toggleContent={toggleContent}
        isExpanded={isExpanded}
        onToggle={(_event, expanded) => setIsExpanded(expanded)}
        data-testid={`existing-secret-expand-${secretName}`}
      >
        <Stack hasGutter>
          {error === 'not-found' && (
            <StackItem>
              <Alert
                variant="danger"
                isInline
                isPlain
                title="This secret was not found. This workbench cannot start until the missing secret is restored or removed."
                data-testid={`secret-not-found-alert-${secretName}`}
                actionLinks={
                  <Button
                    variant="link"
                    isInline
                    data-testid={`remove-missing-secret-${secretName}`}
                    onClick={onRemove}
                  >
                    Remove this reference
                  </Button>
                }
              />
            </StackItem>
          )}
          {missingKeys && missingKeys.length > 0 && (
            <StackItem>
              <Alert
                variant="warning"
                isInline
                isPlain
                title={`${
                  missingKeys.length
                } previously selected key(s) not found in this secret: ${missingKeys.join(', ')}`}
                data-testid={`secret-missing-keys-alert-${secretName}`}
                actionLinks={
                  <Button
                    variant="link"
                    isInline
                    data-testid={`remove-missing-keys-${secretName}`}
                    onClick={handleRemoveMissingKeys}
                  >
                    Remove missing keys
                  </Button>
                }
              />
            </StackItem>
          )}
          {!error && (
            <StackItem>
              <Flex spaceItems={{ default: 'spaceItemsMd' }}>
                <FlexItem>
                  <Button
                    variant="link"
                    isInline
                    data-testid={`select-all-keys-${secretName}`}
                    onClick={allKeys ? handleDeselectAll : handleSelectAll}
                  >
                    {allKeys ? 'Deselect all' : 'Select all'}
                  </Button>
                </FlexItem>
                <FlexItem>
                  {selectedCount} of {totalCount} keys selected
                </FlexItem>
              </Flex>
            </StackItem>
          )}
          {!error && (
            <StackItem>
              <Stack>
                {availableKeys.map((key) => (
                  <StackItem key={key}>
                    <Checkbox
                      id={`${secretName}-key-${key}`}
                      data-testid={`secret-key-checkbox-${secretName}-${key}`}
                      label={key}
                      isChecked={selectedKeys.includes(key)}
                      onChange={(_event, checked) => handleKeyToggle(key, checked)}
                    />
                  </StackItem>
                ))}
              </Stack>
            </StackItem>
          )}
        </Stack>
      </ExpandableSection>
    </div>
  );
};

export default ExistingSecretItem;
