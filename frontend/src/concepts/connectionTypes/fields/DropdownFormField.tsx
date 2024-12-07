import * as React from 'react';

import {
  Badge,
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
import { DropdownField } from '~/concepts/connectionTypes/types';
import { FieldProps } from '~/concepts/connectionTypes/fields/types';
import DefaultValueTextRenderer from '~/concepts/connectionTypes/fields/DefaultValueTextRenderer';

const DropdownFormField: React.FC<FieldProps<DropdownField>> = ({
  id,
  field,
  mode,
  onChange,
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
        ? `Select ${field.name} `
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
                if (selected?.includes(String(v))) {
                  onChange(selected.filter((s) => s !== v));
                } else if (isMulti) {
                  onChange([...(selected || []), String(v)]);
                } else {
                  onChange([String(v)]);
                }

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
        <SelectList>
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
    </DefaultValueTextRenderer>
  );
};

export default DropdownFormField;
