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
  const hasValidOption = field.properties.items?.find((f) => f.value || f.label);
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
            {isMulti ? (
              <>
                {field.name ? `Select ${field.name} ` : 'No values defined yet '}
                <Badge>
                  {(isPreview ? field.properties.defaultValue?.length : value?.length) ?? 0}{' '}
                  selected
                </Badge>
              </>
            ) : (
              (isPreview
                ? field.properties.items?.find(
                    (i) => i.value === field.properties.defaultValue?.[0],
                  )?.label ||
                  field.properties.items?.find(
                    (i) => i.value === field.properties.defaultValue?.[0],
                  )?.value
                : field.properties.items?.find((i) => value?.includes(i.value))?.label ||
                  field.properties.items?.find((i) => value?.includes(i.value))?.value) ||
              (field.name ? `Select ${field.name} ` : 'No values defined yet')
            )}
          </MenuToggle>
        )}
      >
        <SelectList>
          {field.properties.items?.map(
            (i) =>
              (i.value || i.label) && (
                <SelectOption
                  value={i.value}
                  key={i.value}
                  hasCheckbox={isMulti}
                  isSelected={selected?.includes(i.value)}
                  description={`Value: ${i.value}`}
                  isDisabled={!i.value}
                >
                  {i.label || i.value}
                </SelectOption>
              ),
          )}
        </SelectList>
      </Select>
    </DefaultValueTextRenderer>
  );
};

export default DropdownFormField;
