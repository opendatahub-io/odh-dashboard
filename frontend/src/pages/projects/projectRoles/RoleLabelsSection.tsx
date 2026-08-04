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
  Stack,
  StackItem,
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
  onHasInvalidLabelsChange?: (hasInvalid: boolean) => void;
};

const RoleLabelsSection: React.FC<RoleLabelsSectionProps> = ({
  labels,
  onLabelsChange,
  onHasInvalidLabelsChange,
}) => {
  const [touchedFields, setTouchedFields] = React.useState<Set<string>>(
    () => new Set(labels.flatMap((l) => [`${l.id}-key`, `${l.id}-value`])),
  );

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
      const { id } = labels[index];
      onLabelsChange(labels.filter((_, i) => i !== index));
      setTouchedFields((prev) => {
        const keyField = `${id}-key`;
        const valueField = `${id}-value`;
        if (!prev.has(keyField) && !prev.has(valueField)) {
          return prev;
        }
        const next = new Set(prev);
        next.delete(keyField);
        next.delete(valueField);
        return next;
      });
    },
    [labels, onLabelsChange],
  );

  const allKeys = React.useMemo(() => labels.map((l) => l.key), [labels]);

  const hasInvalidLabels = React.useMemo(
    () =>
      labels.some((label, index) => {
        const keyError = validateLabelKey(label.key, allKeys, index) !== null;
        const valueError = validateLabelValue(label.value) !== null;
        const keyTouched = touchedFields.has(`${label.id}-key`);
        const valueTouched = touchedFields.has(`${label.id}-value`);
        return (
          (keyError && (keyTouched || !!label.key)) ||
          (valueError && (valueTouched || !!label.value))
        );
      }),
    [labels, touchedFields, allKeys],
  );

  React.useEffect(() => {
    onHasInvalidLabelsChange?.(hasInvalidLabels);
  }, [hasInvalidLabels, onHasInvalidLabelsChange]);

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
          <FlexItem className="pf-v6-u-visibility-hidden">
            <Button variant="plain" aria-hidden tabIndex={-1}>
              <MinusCircleIcon />
            </Button>
          </FlexItem>
        </Flex>
      )}
      {labels.length > 0 && (
        <Stack hasGutter>
          {labels.map((label, index) => {
            const keyError = validateLabelKey(label.key, allKeys, index);
            const valueError = validateLabelValue(label.value);
            const keyTouched = touchedFields.has(`${label.id}-key`);
            const valueTouched = touchedFields.has(`${label.id}-value`);
            const showKeyError = keyError && keyTouched;
            const showValueError = valueError && valueTouched;
            const keyErrorId = `${label.id}-key-error`;
            const valueErrorId = `${label.id}-value-error`;
            const isLastRow = index === labels.length - 1;
            const showKeyDefault = isLastRow && !showKeyError;
            const showValueDefault = isLastRow && !showValueError;
            const keyDefaultVariant =
              !keyError && label.key.length > 0 ? 'success' : 'indeterminate';
            const valueDefaultVariant =
              !valueError && label.value.length > 0 ? 'success' : 'indeterminate';

            return (
              <StackItem key={label.id}>
                <Flex
                  spaceItems={{ default: 'spaceItemsSm' }}
                  alignItems={{ default: 'alignItemsFlexStart' }}
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
                      placeholder="Example: Team"
                      validated={showKeyError ? ValidatedOptions.error : ValidatedOptions.default}
                    />
                    {showKeyError ? (
                      <FormHelperText>
                        <HelperText>
                          <HelperTextItem
                            icon={<ExclamationCircleIcon aria-hidden />}
                            variant="error"
                            id={keyErrorId}
                            data-testid={`role-label-key-error-${index}`}
                          >
                            {keyError}
                          </HelperTextItem>
                        </HelperText>
                      </FormHelperText>
                    ) : (
                      showKeyDefault && (
                        <FormHelperText>
                          <HelperText>
                            <HelperTextItem variant={keyDefaultVariant}>
                              Must be 1&ndash;63 characters and start and end with a letter or
                              number. Valid characters include letters, numbers, hyphens (-),
                              periods (.), and underscores (_).
                            </HelperTextItem>
                          </HelperText>
                        </FormHelperText>
                      )
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
                      placeholder="Example: Engineering"
                      validated={showValueError ? ValidatedOptions.error : ValidatedOptions.default}
                    />
                    {showValueError ? (
                      <FormHelperText>
                        <HelperText>
                          <HelperTextItem
                            icon={<ExclamationCircleIcon aria-hidden />}
                            variant="error"
                            id={valueErrorId}
                            data-testid={`role-label-value-error-${index}`}
                          >
                            {valueError}
                          </HelperTextItem>
                        </HelperText>
                      </FormHelperText>
                    ) : (
                      showValueDefault && (
                        <FormHelperText>
                          <HelperText>
                            <HelperTextItem variant={valueDefaultVariant}>
                              Can be empty or up to 63 characters. If provided, must start and end
                              with a letter or number. Valid characters include letters, numbers,
                              hyphens (-), periods (.), and underscores (_).
                            </HelperTextItem>
                          </HelperText>
                        </FormHelperText>
                      )
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
              </StackItem>
            );
          })}
          <StackItem>
            <Button
              variant="link"
              icon={<PlusCircleIcon />}
              onClick={handleAddLabel}
              data-testid="role-add-label"
            >
              Add label
            </Button>
          </StackItem>
        </Stack>
      )}
      {labels.length === 0 && (
        <Button
          variant="link"
          icon={<PlusCircleIcon />}
          onClick={handleAddLabel}
          data-testid="role-add-label"
        >
          Add label
        </Button>
      )}
    </FormGroup>
  );
};

export default RoleLabelsSection;
