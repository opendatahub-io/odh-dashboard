import React from 'react';
import {
  Button,
  Flex,
  FlexItem,
  HelperText,
  HelperTextItem,
  Stack,
  StackItem,
  TextInput,
} from '@patternfly/react-core';

type InheritedProviderConfigProps = {
  config: Record<string, string>;
  previewCount?: number;
};

const InheritedProviderConfig: React.FC<InheritedProviderConfigProps> = ({
  config,
  previewCount,
}) => {
  const entries = Object.entries(config);
  const [showAll, setShowAll] = React.useState(false);
  const hasPreviewLimit = previewCount !== undefined && entries.length > previewCount;
  const visibleEntries = hasPreviewLimit && !showAll ? entries.slice(0, previewCount) : entries;

  if (entries.length === 0) {
    return (
      <HelperText>
        <HelperTextItem>
          <strong>This provider has no configuration values.</strong>
        </HelperTextItem>
      </HelperText>
    );
  }

  return (
    <Stack hasGutter data-testid="inherited-provider-config">
      <StackItem>
        <Flex gap={{ default: 'gapSm' }}>
          <FlexItem flex={{ default: 'flex_1' }}>
            <strong>Key</strong>
          </FlexItem>
          <FlexItem flex={{ default: 'flex_2' }}>
            <strong>Value</strong>
          </FlexItem>
        </Flex>
      </StackItem>
      {visibleEntries.map(([key, value]) => (
        <StackItem key={key}>
          <Flex gap={{ default: 'gapSm' }}>
            <FlexItem flex={{ default: 'flex_1' }}>
              <TextInput
                value={key}
                readOnlyVariant="default"
                aria-label={`Key ${key}`}
                data-testid={`inherited-config-key-${key}`}
              />
            </FlexItem>
            <FlexItem flex={{ default: 'flex_2' }}>
              <TextInput
                value={value}
                readOnlyVariant="default"
                aria-label={`Value for ${key}`}
                data-testid={`inherited-config-value-${key}`}
              />
            </FlexItem>
          </Flex>
        </StackItem>
      ))}
      {hasPreviewLimit && (
        <StackItem>
          <Button
            variant="link"
            onClick={() => setShowAll((prev) => !prev)}
            data-testid="inherited-provider-config-show-more"
          >
            {showAll ? 'Show less' : 'Show more'}
          </Button>
        </StackItem>
      )}
    </Stack>
  );
};

export default InheritedProviderConfig;
