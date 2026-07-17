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
  Content,
  ContentVariants,
} from '@patternfly/react-core';
import { ExclamationCircleIcon, ExclamationTriangleIcon } from '@patternfly/react-icons';
import { ExistingSecretRef } from '#~/pages/projects/types';

type ExistingSecretItemProps = {
  secretRef: ExistingSecretRef;
  secretStatus: 'loaded' | 'not-found' | 'error';
  onUpdateKeys: (selectedKeys: string[]) => void;
  onRemove: () => void;
};

const ExistingSecretItem: React.FC<ExistingSecretItemProps> = ({
  secretRef,
  secretStatus,
  onUpdateKeys,
  onRemove,
}) => {
  const [isExpanded, setIsExpanded] = React.useState(false);
  const { secretName, selectedKeys, allKeys } = secretRef;
  const selectedCount = selectedKeys.length;
  const totalCount = allKeys.length;

  const missingKeys = selectedKeys.filter((key) => !allKeys.includes(key));
  const hasMissingKeys = missingKeys.length > 0 && secretStatus === 'loaded';
  const isDeleted = secretStatus === 'not-found';

  const statusIcon = isDeleted ? (
    <Icon status="danger" isInline>
      <ExclamationCircleIcon />
    </Icon>
  ) : hasMissingKeys ? (
    <Icon status="warning" isInline>
      <ExclamationTriangleIcon />
    </Icon>
  ) : null;

  const badgeText = isDeleted ? '0 of 0 keys' : `${selectedCount} of ${totalCount} keys`;

  const handleKeyToggle = (key: string, checked: boolean) => {
    if (checked) {
      onUpdateKeys([...selectedKeys, key]);
    } else {
      onUpdateKeys(selectedKeys.filter((k) => k !== key));
    }
  };

  const handleDeselectAll = () => {
    onUpdateKeys([]);
  };

  const handleRemoveMissingKeys = () => {
    onUpdateKeys(selectedKeys.filter((key) => allKeys.includes(key)));
  };

  return (
    <ExpandableSection
      data-testid={`existing-secret-item-${secretName}`}
      isExpanded={isExpanded}
      onToggle={(_event, expanded) => setIsExpanded(expanded)}
      toggleContent={
        <Flex spaceItems={{ default: 'spaceItemsSm' }} alignItems={{ default: 'alignItemsCenter' }}>
          <FlexItem>
            <strong>{secretName}</strong>
          </FlexItem>
          <FlexItem>
            <Badge isRead data-testid={`secret-key-badge-${secretName}`}>
              {badgeText}
            </Badge>
          </FlexItem>
          {statusIcon ? <FlexItem>{statusIcon}</FlexItem> : null}
        </Flex>
      }
    >
      <Stack hasGutter>
        {isDeleted ? (
          <StackItem>
            <Alert
              variant="danger"
              isInline
              isPlain
              title="This secret was not found"
              data-testid={`secret-deleted-alert-${secretName}`}
            >
              This workbench cannot start until the missing secret is restored or removed.
              <br />
              <Button
                variant="link"
                isInline
                data-testid={`remove-secret-ref-${secretName}`}
                onClick={onRemove}
              >
                Remove this reference
              </Button>
            </Alert>
          </StackItem>
        ) : (
          <>
            {hasMissingKeys ? (
              <StackItem>
                <Alert
                  variant="warning"
                  isInline
                  isPlain
                  title="Some keys are no longer available"
                  data-testid={`secret-missing-keys-alert-${secretName}`}
                >
                  The following keys were previously selected but no longer exist in the secret:{' '}
                  {missingKeys.join(', ')}.
                  <br />
                  <Button
                    variant="link"
                    isInline
                    data-testid={`remove-missing-keys-${secretName}`}
                    onClick={handleRemoveMissingKeys}
                  >
                    Remove missing keys
                  </Button>
                </Alert>
              </StackItem>
            ) : null}
            <StackItem>
              <Flex
                justifyContent={{ default: 'justifyContentSpaceBetween' }}
                alignItems={{ default: 'alignItemsCenter' }}
              >
                <FlexItem>
                  <Button
                    variant="link"
                    isInline
                    data-testid={`deselect-all-keys-${secretName}`}
                    onClick={handleDeselectAll}
                    isDisabled={selectedCount === 0}
                  >
                    Deselect all
                  </Button>
                </FlexItem>
                <FlexItem>
                  <Content component={ContentVariants.small}>
                    {selectedCount} of {totalCount} keys selected
                  </Content>
                </FlexItem>
              </Flex>
            </StackItem>
            <StackItem>
              <Stack>
                {allKeys.map((key) => (
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
          </>
        )}
      </Stack>
    </ExpandableSection>
  );
};

export default ExistingSecretItem;
