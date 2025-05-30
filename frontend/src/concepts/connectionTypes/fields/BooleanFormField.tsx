import * as React from 'react';
import { Checkbox } from '@patternfly/react-core';
import { BooleanField } from '#~/concepts/connectionTypes/types';
import { FieldProps } from '#~/concepts/connectionTypes/fields/types';

const BooleanFormField: React.FC<FieldProps<BooleanField>> = ({
  id,
  field,
  mode,
  onChange,
  value,
  'data-testid': dataTestId,
}) => {
  const isPreview = mode === 'preview';
  return (
    <Checkbox
      aria-readonly={isPreview}
      id={id}
      name={id}
      data-testid={dataTestId}
      label={mode === 'default' ? 'Checkbox is selected' : field.properties.label}
      aria-label={field.properties.label || field.name}
      isDisabled={field.properties.defaultReadOnly}
      isChecked={
        isPreview || field.properties.defaultReadOnly ? !!field.properties.defaultValue : !!value
      }
      onChange={
        isPreview || field.properties.defaultReadOnly || !onChange
          ? () => undefined
          : (_e, v) => onChange(v)
      }
    />
  );
};

export default BooleanFormField;
