import * as React from 'react';

import {
  Badge,
  FormHelperText,
  HelperText,
  HelperTextItem,
  MenuToggle,
  /**
   * This is a special use case to use the Select component to dynamically generate either single/multi dropdown component
   * And it allows user to de-select options
   * No need to replace it with SimpleSelect or MultiSelection component here
   */
  // eslint-disable-next-line no-restricted-imports
  Select,
  SelectList,
  SelectOption,
} from '@patternfly/react-core';
import { ExclamationCircleIcon } from '@patternfly/react-icons';
import { DropdownField } from '#~/concepts/connectionTypes/types';
import { FieldProps } from '#~/concepts/connectionTypes/fields/types';
import DefaultValueTextRenderer from '#~/concepts/connectionTypes/fields/DefaultValueTextRenderer';

const DropdownFormField: React.FC<FieldProps<DropdownField>> = ({
  id,
  field,
  mode,
  onChange,
  onValidate,
  error,
  value,
  'data-testid': dataTestId,
}) => {
  const isPreview = mode === 'preview';
  const [isOpen, setIsOpen] = React.useState(false);
  const isMulti = field.properties.variant === 'multi';
  const selected = isPreview ? field.properties.defaultValue : value;
  const hasValidOption = field.properties.items?.find((f) => f.value || f.label);

  const menuToggleText = () => {
    let text = field.properties.items?.some((i) => i.label || i.value)
      ? field.name
        ? `Select ${field.name.toLocaleLowerCase()} `
        : 'Select'
      : 'No values defined';
    if (!isMulti) {
      if (isPreview) {
        const defaultOption = field.properties.items?.find(
          (i) => i.value === field.properties.defaultValue?.[0],
        );
        if (defaultOption) {
          text = defaultOption.label || defaultOption.value;
        }
      } else {
        const currentSelection = field.properties.items?.find((i) => value?.includes(i.value));
        if (currentSelection) {
          text = currentSelection.label || currentSelection.value;
        }
      }
    }
    return text;
  };

  return (
    <DefaultValueTextRenderer id={id} field={field} mode={mode}>
      <Select
        isOpen={isOpen}
        shouldFocusToggleOnSelect
        onSelect={
          isPreview || !onChange
            ? undefined
            : (_e, v) => {
                let newValue;
                if (selected?.includes(String(v))) {
                  newValue = selected.filter((s) => s !== v);
                } else if (isMulti) {
                  newValue = [...(selected || []), String(v)];
                } else {
                  newValue = [String(v)];
                }
                onChange(newValue);
                onValidate?.(false, newValue);

                if (!isMulti) {
                  setIsOpen(false);
                }
              }
        }
        onOpenChange={(open) => setIsOpen(open)}
        toggle={(toggleRef) => (
          <MenuToggle
            ref={toggleRef}
            id={id}
            data-testid={dataTestId}
            isFullWidth
            onClick={() => {
              setIsOpen((open) => !open);
            }}
            isExpanded={isOpen}
            isDisabled={!hasValidOption}
            status={error ? 'danger' : undefined}
          >
            <>
              {menuToggleText()}
              {isMulti && (
                <Badge className="pf-v6-u-ml-xs">
                  {(isPreview ? field.properties.defaultValue?.length : value?.length) ?? 0}{' '}
                  selected
                </Badge>
              )}
            </>
          </MenuToggle>
        )}
      >
        <SelectList isAriaMultiselectable={isMulti}>
          {field.properties.items?.map(
            (item, index) =>
              (item.value || item.label) && (
                <SelectOption
                  value={item.value}
                  key={index}
                  hasCheckbox={isMulti}
                  isSelected={selected?.includes(item.value)}
                  description={`Value: ${item.value}`}
                  isDisabled={!item.value}
                >
                  {item.label || item.value}
                </SelectOption>
              ),
          )}
        </SelectList>
      </Select>
      {error && typeof error === 'string' && (
        <FormHelperText>
          <HelperText>
            <HelperTextItem icon={<ExclamationCircleIcon />} variant="error">
              {error}
            </HelperTextItem>
          </HelperText>
        </FormHelperText>
      )}
    </DefaultValueTextRenderer>
  );
};

export default DropdownFormField;
