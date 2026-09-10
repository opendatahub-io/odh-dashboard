import React from 'react';
import { Button, Flex, FlexItem, FormGroup, TextInput } from '@patternfly/react-core';
import { MinusCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';

export type ConfigPair = {
  key: string;
  value: string;
};

type ModelConfigPairsEditorProps = {
  pairs: ConfigPair[];
  onChange: (pairs: ConfigPair[]) => void;
};

const ModelConfigPairsEditor: React.FC<ModelConfigPairsEditorProps> = ({ pairs, onChange }) => {
  const handlePairChange = (index: number, field: 'key' | 'value', value: string) => {
    onChange(pairs.map((pair, i) => (i === index ? { ...pair, [field]: value } : pair)));
  };

  const handleAddPair = () => {
    onChange([...pairs, { key: '', value: '' }]);
  };

  const handleRemovePair = (index: number) => {
    onChange(pairs.filter((_, i) => i !== index));
  };

  return (
    <>
      {pairs.map((pair, index) => (
        <FormGroup
          key={`config-pair-${index}`}
          fieldId={`provider-ref-config-pair-${index}`}
          isStack
        >
          <Flex gap={{ default: 'gapSm' }} className="pf-v6-u-w-100">
            <FlexItem flex={{ default: 'flex_1' }}>
              <TextInput
                id={`provider-ref-config-key-${index}`}
                data-testid={`provider-ref-config-key-${index}`}
                aria-label="Configuration key"
                placeholder="Key"
                value={pair.key}
                onChange={(_event, value) => handlePairChange(index, 'key', value)}
              />
            </FlexItem>
            <FlexItem flex={{ default: 'flex_1' }}>
              <TextInput
                id={`provider-ref-config-value-${index}`}
                data-testid={`provider-ref-config-value-${index}`}
                aria-label="Configuration value"
                placeholder="Value"
                value={pair.value}
                onChange={(_event, value) => handlePairChange(index, 'value', value)}
              />
            </FlexItem>
            <FlexItem>
              <Button
                variant="plain"
                aria-label="Remove configuration pair"
                onClick={() => handleRemovePair(index)}
                data-testid={`provider-ref-config-remove-${index}`}
              >
                <MinusCircleIcon />
              </Button>
            </FlexItem>
          </Flex>
        </FormGroup>
      ))}
      <Button
        variant="link"
        icon={<PlusCircleIcon />}
        onClick={handleAddPair}
        data-testid="add-configuration-pair-button"
        isInline
      >
        Add configuration pair
      </Button>
    </>
  );
};

export const configPairsToRecord = (pairs: ConfigPair[]): Record<string, string> | undefined => {
  const record = pairs.reduce<Record<string, string>>((acc, pair) => {
    const trimmedKey = pair.key.trim();
    if (trimmedKey) {
      acc[trimmedKey] = pair.value.trim();
    }
    return acc;
  }, {});

  return Object.keys(record).length > 0 ? record : undefined;
};

export default ModelConfigPairsEditor;
