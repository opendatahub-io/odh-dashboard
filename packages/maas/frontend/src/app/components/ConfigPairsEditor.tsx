import * as React from 'react';
import {
  Button,
  Flex,
  FlexItem,
  FormGroup,
  Stack,
  StackItem,
  TextInput,
} from '@patternfly/react-core';
import { MinusCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { ConfigPair, EMPTY_CONFIG_PAIR } from '~/app/utilities/configPairs';

type ConfigPairsEditorProps = {
  pairs: ConfigPair[];
  onChange: (pairs: ConfigPair[]) => void;
  testIdPrefix: string;
  addButtonTestId?: string;
};

const updatePair = (
  pairs: ConfigPair[],
  index: number,
  update: Partial<ConfigPair>,
): ConfigPair[] => pairs.map((pair, i) => (i === index ? { ...pair, ...update } : pair));

const removePair = (pairs: ConfigPair[], index: number): ConfigPair[] =>
  pairs.filter((_, i) => i !== index);

const ConfigPairsEditor: React.FC<ConfigPairsEditorProps> = ({
  pairs,
  onChange,
  testIdPrefix,
  addButtonTestId,
}) => (
  <Stack hasGutter>
    {pairs.length > 0 && (
      <StackItem>
        <Flex gap={{ default: 'gapSm' }} className="pf-v6-u-w-100">
          <FlexItem flex={{ default: 'flex_1' }} className="pf-v6-u-min-width-0">
            <strong>Key</strong>
          </FlexItem>
          <FlexItem flex={{ default: 'flex_1' }} className="pf-v6-u-min-width-0">
            <strong>Value</strong>
          </FlexItem>
          <FlexItem flex={{ default: 'flexNone' }} aria-hidden="true">
            <Button
              variant="plain"
              tabIndex={-1}
              isDisabled
              icon={<MinusCircleIcon />}
              style={{ visibility: 'hidden' }}
            />
          </FlexItem>
        </Flex>
      </StackItem>
    )}
    {pairs.map((pair, index) => (
      <StackItem key={index} data-testid={`${testIdPrefix}-pair-${index}`}>
        <FormGroup fieldId={`${testIdPrefix}-pair-${index}`} isStack>
          <Flex gap={{ default: 'gapSm' }} className="pf-v6-u-w-100">
            <FlexItem flex={{ default: 'flex_1' }} className="pf-v6-u-min-width-0">
              <TextInput
                id={`${testIdPrefix}-key-${index}`}
                data-testid={`${testIdPrefix}-key-${index}`}
                aria-label={`Configuration key ${index + 1}`}
                placeholder="Key"
                value={pair.key}
                className="pf-v6-u-w-100"
                onChange={(_event, value) => onChange(updatePair(pairs, index, { key: value }))}
              />
            </FlexItem>
            <FlexItem flex={{ default: 'flex_1' }} className="pf-v6-u-min-width-0">
              <TextInput
                id={`${testIdPrefix}-value-${index}`}
                data-testid={`${testIdPrefix}-value-${index}`}
                aria-label={`Configuration value ${index + 1}`}
                placeholder="Value"
                value={pair.value}
                className="pf-v6-u-w-100"
                onChange={(_event, value) => onChange(updatePair(pairs, index, { value }))}
              />
            </FlexItem>
            <FlexItem flex={{ default: 'flexNone' }}>
              <Button
                variant="plain"
                aria-label={`Remove configuration pair ${index + 1}`}
                icon={<MinusCircleIcon />}
                onClick={() => onChange(removePair(pairs, index))}
                data-testid={`${testIdPrefix}-remove-${index}`}
              />
            </FlexItem>
          </Flex>
        </FormGroup>
      </StackItem>
    ))}
    <StackItem>
      <Button
        variant="link"
        isInline
        icon={<PlusCircleIcon />}
        iconPosition="start"
        onClick={() => onChange([...pairs, EMPTY_CONFIG_PAIR])}
        data-testid={addButtonTestId ?? `${testIdPrefix}-add-button`}
      >
        Add key-value pair
      </Button>
    </StackItem>
  </Stack>
);

export default ConfigPairsEditor;
