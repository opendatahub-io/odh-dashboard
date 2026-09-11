import * as React from 'react';
import {
  Button,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  Split,
  SplitItem,
  Stack,
  StackItem,
  TextInput,
} from '@patternfly/react-core';
import { MinusCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { ConfigPair } from '~/app/pages/external-providers/types';
import { EMPTY_CONFIG_PAIR } from '~/app/pages/external-providers/const';

type ProviderConfigKeyValueFieldProps = {
  pairs: ConfigPair[];
  onChange: (pairs: ConfigPair[]) => void;
};

const updatePair = (
  pairs: ConfigPair[],
  index: number,
  update: Partial<ConfigPair>,
): ConfigPair[] => pairs.map((pair, i) => (i === index ? { ...pair, ...update } : pair));

const removePair = (pairs: ConfigPair[], index: number): ConfigPair[] => {
  const next = pairs.filter((_, i) => i !== index);
  return next.length > 0 ? next : [EMPTY_CONFIG_PAIR];
};

const ProviderConfigKeyValueField: React.FC<ProviderConfigKeyValueFieldProps> = ({
  pairs,
  onChange,
}) => (
  <Stack hasGutter>
    {pairs.map((pair, index) => (
      <StackItem key={index} data-testid={`provider-config-pair-${index}`}>
        <Split hasGutter>
          <SplitItem isFilled>
            <TextInput
              aria-label={`Configuration key ${index + 1}`}
              placeholder="Key"
              value={pair.key}
              onChange={(_event, value) => onChange(updatePair(pairs, index, { key: value }))}
              data-testid={`provider-config-key-${index}`}
            />
          </SplitItem>
          <SplitItem isFilled>
            <TextInput
              aria-label={`Configuration value ${index + 1}`}
              placeholder="Value"
              value={pair.value}
              onChange={(_event, value) => onChange(updatePair(pairs, index, { value }))}
              data-testid={`provider-config-value-${index}`}
            />
          </SplitItem>
          <SplitItem>
            <Button
              variant="plain"
              aria-label={`Remove configuration pair ${index + 1}`}
              icon={<MinusCircleIcon />}
              onClick={() => onChange(removePair(pairs, index))}
              data-testid={`provider-config-remove-${index}`}
            />
          </SplitItem>
        </Split>
      </StackItem>
    ))}
    <StackItem>
      <Button
        variant="link"
        isInline
        icon={<PlusCircleIcon />}
        iconPosition="start"
        onClick={() => onChange([...pairs, EMPTY_CONFIG_PAIR])}
        data-testid="add-provider-config-pair-button"
      >
        Add configuration pair
      </Button>
    </StackItem>
  </Stack>
);

export const ProviderConfigurationSection: React.FC<
  ProviderConfigKeyValueFieldProps & { validationMessage?: string }
> = ({ pairs, onChange, validationMessage }) => (
  <Stack hasGutter>
    <StackItem>
      <p>
        Define key-value pairs for this provider. Values are only used as {'{key}'} placeholders in
        the model&apos;s path field — they do not affect other configuration. All models referencing
        this provider inherit these pairs.
      </p>
      <p>
        For example, Vertex AI providers typically need <strong>project</strong> and{' '}
        <strong>location</strong> keys (for example, project=my-gcp-project, location=us-central1).
        AWS Bedrock may need <strong>region</strong>.
      </p>
    </StackItem>
    <StackItem>
      <FormGroup label="Provider configuration" fieldId="provider-configuration">
        <ProviderConfigKeyValueField pairs={pairs} onChange={onChange} />
        {validationMessage && (
          <FormHelperText>
            <HelperText>
              <HelperTextItem variant="error">{validationMessage}</HelperTextItem>
            </HelperText>
          </FormHelperText>
        )}
      </FormGroup>
    </StackItem>
  </Stack>
);

export const countNonEmptyConfigPairs = (pairs: ConfigPair[]): number =>
  pairs.filter((pair) => pair.key.trim()).length;

export default ProviderConfigKeyValueField;
