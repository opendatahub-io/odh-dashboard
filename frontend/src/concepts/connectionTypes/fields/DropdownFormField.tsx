import * as React from 'react';
import { Badge, MenuToggle, Select, SelectList, SelectOption } from '@patternfly/react-core';
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
  return (
    <DefaultValueTextRenderer id={id} field={field} mode={mode}>
      <Select
        isOpen={isOpen}
        shouldFocusToggleOnSelect
        selected={selected}
        onSelect={
          isPreview || !onChange
            ? undefined
            : (_e, v) => {
                if (isMulti) {
                  if (selected?.includes(String(v))) {
                    onChange(selected.filter((s) => s !== v));
                  } else {
                    onChange([...(selected || []), String(v)]);
                  }
                } else {
                  onChange([String(v)]);
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
          >
            {isMulti ? (
              <>
                Count{' '}
                <Badge>
                  {(isPreview ? field.properties.defaultValue?.length : value?.length) ?? 0}{' '}
                  selected
                </Badge>
              </>
            ) : (
              (isPreview
                ? field.properties.items?.find(
                    (i) => i.value === field.properties.defaultValue?.[0],
                  )?.label
                : field.properties.items?.find((i) => value?.includes(i.value))?.label) ||
              'Select a value'
            )}
          </MenuToggle>
        )}
      >
        <SelectList>
          {field.properties.items?.map((i) => (
            <SelectOption
              value={i.value}
              key={i.value}
              hasCheckbox={isMulti}
              selected={selected?.includes(i.value)}
            >
              {i.label}
            </SelectOption>
          ))}
        </SelectList>
      </Select>
    </DefaultValueTextRenderer>
  );
};

export default DropdownFormField;
