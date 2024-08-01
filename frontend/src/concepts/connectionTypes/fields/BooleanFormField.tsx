import * as React from 'react';
import { Checkbox } from '@patternfly/react-core';
import { BooleanField } from '~/concepts/connectionTypes/types';
import DataFormFieldGroup from '~/concepts/connectionTypes/fields/DataFormFieldGroup';

type Props = {
  field: BooleanField;
  isPreview?: boolean;
  value?: boolean;
  onChange?: (value: boolean) => void;
};

const BooleanFormField: React.FC<Props> = ({ field, isPreview, onChange, value }) => (
  <DataFormFieldGroup field={field} isPreview={!!isPreview} renderDefaultValue={false}>
    {(id) => (
      <Checkbox
        aria-readonly={isPreview}
        id={id}
        name={id}
        label={field.properties.label}
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
    )}
  </DataFormFieldGroup>
);

export default BooleanFormField;
