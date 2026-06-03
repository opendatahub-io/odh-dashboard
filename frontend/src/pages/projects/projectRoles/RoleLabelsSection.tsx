import * as React from 'react';
import {
  Button,
  Content,
  Flex,
  FlexItem,
  FormGroup,
  TextInput,
  getUniqueId,
} from '@patternfly/react-core';
import { MinusCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import type { LabelEntry } from './types';

type RoleLabelsSectionProps = {
  labels: LabelEntry[];
  onLabelsChange: (labels: LabelEntry[]) => void;
};

const RoleLabelsSection: React.FC<RoleLabelsSectionProps> = ({ labels, onLabelsChange }) => {
  const handleLabelChange = React.useCallback(
    (index: number, field: 'key' | 'value', newValue: string) => {
      const updated = labels.map((label, i) =>
        i === index ? { ...label, [field]: newValue } : label,
      );
      onLabelsChange(updated);
    },
    [labels, onLabelsChange],
  );

  const handleAddLabel = React.useCallback(() => {
    onLabelsChange([...labels, { id: getUniqueId('label'), key: '', value: '' }]);
  }, [labels, onLabelsChange]);

  const handleRemoveLabel = React.useCallback(
    (index: number) => {
      onLabelsChange(labels.filter((_, i) => i !== index));
    },
    [labels, onLabelsChange],
  );

  return (
    <FormGroup label="Labels" fieldId="role-labels">
      <Content component="p">
        Add key/value labels to organize and filter roles (for example by organization, category or
        team).
      </Content>
      {labels.map((label, index) => (
        <Flex
          key={label.id}
          spaceItems={{ default: 'spaceItemsSm' }}
          className="pf-v6-u-mb-sm"
          data-testid={`role-label-${index}`}
        >
          <FlexItem flex={{ default: 'flex_1' }}>
            <TextInput
              aria-label={`Label key ${index + 1}`}
              data-testid={`role-label-key-${index}`}
              value={label.key}
              onChange={(_event, value) => handleLabelChange(index, 'key', value)}
              placeholder="Key"
            />
          </FlexItem>
          <FlexItem flex={{ default: 'flex_1' }}>
            <TextInput
              aria-label={`Label value ${index + 1}`}
              data-testid={`role-label-value-${index}`}
              value={label.value}
              onChange={(_event, value) => handleLabelChange(index, 'value', value)}
              placeholder="Value"
            />
          </FlexItem>
          <FlexItem>
            <Button
              variant="plain"
              aria-label={`Remove label ${index + 1}`}
              data-testid={`role-label-remove-${index}`}
              onClick={() => handleRemoveLabel(index)}
            >
              <MinusCircleIcon />
            </Button>
          </FlexItem>
        </Flex>
      ))}
      <Button
        variant="link"
        icon={<PlusCircleIcon />}
        onClick={handleAddLabel}
        data-testid="role-add-label"
      >
        Add label
      </Button>
    </FormGroup>
  );
};

export default RoleLabelsSection;
