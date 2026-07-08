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
  const [touchedFields, setTouchedFields] = React.useState<Set<string>>(() => new Set());

  const markTouched = React.useCallback((fieldId: string) => {
    setTouchedFields((prev) => {
      if (prev.has(fieldId)) {
        return prev;
      }
      const next = new Set(prev);
      next.add(fieldId);
      return next;
    });
  }, []);

  const handleLabelChange = React.useCallback(
    (index: number, field: 'key' | 'value', newValue: string) => {
      markTouched(`${labels[index].id}-${field}`);
      const updated = labels.map((label, i) =>
        i === index ? { ...label, [field]: newValue } : label,
      );
      onLabelsChange(updated);
    },
    [labels, onLabelsChange, markTouched],
  );

  const handleAddLabel = React.useCallback(() => {
    onLabelsChange([...labels, { id: getUniqueId('label'), key: '', value: '' }]);
  }, [labels, onLabelsChange]);

  const handleRemoveLabel = React.useCallback(
    (index: number) => {
      const removedId = labels[index]?.id;
      onLabelsChange(labels.filter((_, i) => i !== index));
      if (removedId) {
        setTouchedFields((prev) => {
          const keyField = `${removedId}-key`;
          const valueField = `${removedId}-value`;
          if (!prev.has(keyField) && !prev.has(valueField)) {
            return prev;
          }
          const next = new Set(prev);
          next.delete(keyField);
          next.delete(valueField);
          return next;
        });
      }
    },
    [labels, onLabelsChange],
  );

  const allKeys = React.useMemo(() => labels.map((l) => l.key), [labels]);

  return (
    <FormGroup label="Labels" fieldId="role-labels">
      <Content component="p">{LABELS_FORM_DESCRIPTION}</Content>
      {labels.length > 0 && (
        <Flex spaceItems={{ default: 'spaceItemsSm' }} className="pf-v6-u-mb-sm">
          <FlexItem flex={{ default: 'flex_1' }}>
            <Content component="small" className="pf-v6-u-font-weight-bold">
              Key
            </Content>
          </FlexItem>
          <FlexItem flex={{ default: 'flex_1' }}>
            <Content component="small" className="pf-v6-u-font-weight-bold">
              Value
            </Content>
          </FlexItem>
          <FlexItem style={{ visibility: 'hidden' }}>
            <Button variant="plain" aria-hidden>
              <MinusCircleIcon />
            </Button>
          </FlexItem>
        </Flex>
      )}
      {labels.map((label, index) => {
        const keyError = validateLabelKey(label.key, allKeys, index);
        const valueError = validateLabelValue(label.value);
        const keyTouched = touchedFields.has(`${label.id}-key`);
        const valueTouched = touchedFields.has(`${label.id}-value`);
        const showKeyError = keyError && keyTouched;
        const showValueError = valueError && valueTouched;
        const keyErrorId = `${label.id}-key-error`;
        const valueErrorId = `${label.id}-value-error`;

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
                aria-describedby={showKeyError ? keyErrorId : undefined}
                data-testid={`role-label-key-${index}`}
                value={label.key}
                onChange={(_event, value) => handleLabelChange(index, 'key', value)}
                onBlur={() => markTouched(`${label.id}-key`)}
                placeholder="Key"
                validated={showKeyError ? ValidatedOptions.error : ValidatedOptions.default}
              />
              {showKeyError && (
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem
                      icon={<ExclamationCircleIcon />}
                      variant="error"
                      id={keyErrorId}
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
                aria-describedby={showValueError ? valueErrorId : undefined}
                data-testid={`role-label-value-${index}`}
                value={label.value}
                onChange={(_event, value) => handleLabelChange(index, 'value', value)}
                onBlur={() => markTouched(`${label.id}-value`)}
                placeholder="Value"
                validated={showValueError ? ValidatedOptions.error : ValidatedOptions.default}
              />
              {showValueError && (
                <FormHelperText>
                  <HelperText>
                    <HelperTextItem
                      icon={<ExclamationCircleIcon />}
                      variant="error"
                      id={valueErrorId}
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
