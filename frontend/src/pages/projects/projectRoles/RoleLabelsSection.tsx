import * as React from 'react';
import {
  Button,
  Content,
  Flex,
  FlexItem,
  FormGroup,
  FormHelperText,
  HelperText,
  HelperTextItem,
  TextInput,
  ValidatedOptions,
  getUniqueId,
} from '@patternfly/react-core';
import { ExclamationCircleIcon, MinusCircleIcon, PlusCircleIcon } from '@patternfly/react-icons';
import { LABELS_FORM_DESCRIPTION } from './const';
import { validateLabelKey, validateLabelValue } from './labelUtils';
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

  const allKeys = React.useMemo(() => labels.map((l) => l.key), [labels]);

  return (
    <FormGroup label="Labels" fieldId="role-labels">
      <Content component="p">{LABELS_FORM_DESCRIPTION}</Content>
      {labels.map((label, index) => {
        const keyError = validateLabelKey(label.key, allKeys, index);
        const valueError = validateLabelValue(label.value);

        return (
          <Flex
            key={label.id}
            spaceItems={{ default: 'spaceItemsSm' }}
            alignItems={{ default: 'alignItemsFlexStart' }}
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
                validated={keyError ? ValidatedOptions.error : ValidatedOptions.default}
              />
              {keyError && (
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem
                      icon={<ExclamationCircleIcon />}
                      variant="error"
                      data-testid={`role-label-key-error-${index}`}
                    >
                      {keyError}
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              )}
            </FlexItem>
            <FlexItem flex={{ default: 'flex_1' }}>
              <TextInput
                aria-label={`Label value ${index + 1}`}
                data-testid={`role-label-value-${index}`}
                value={label.value}
                onChange={(_event, value) => handleLabelChange(index, 'value', value)}
                placeholder="Value"
                validated={valueError ? ValidatedOptions.error : ValidatedOptions.default}
              />
              {valueError && (
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem
                      icon={<ExclamationCircleIcon />}
                      variant="error"
                      data-testid={`role-label-value-error-${index}`}
                    >
                      {valueError}
                    </HelperTextItem>
                  </HelperText>
                </FormHelperText>
              )}
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
        );
      })}
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
