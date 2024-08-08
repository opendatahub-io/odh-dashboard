import * as React from 'react';
import { NumericField } from '~/concepts/connectionTypes/types';
import NumberInputWrapper from '~/components/NumberInputWrapper';
import DataFormFieldGroup from '~/concepts/connectionTypes/fields/DataFormFieldGroup';

type Props = {
  field: NumericField;
  isPreview?: boolean;
  value?: number;
  onChange?: (value: number) => void;
};

const NumericFormField: React.FC<Props> = ({ field, isPreview, onChange, value }) => (
  <DataFormFieldGroup field={field} isPreview={!!isPreview}>
    {(id) => (
      <NumberInputWrapper
        inputProps={{
          'aria-readonly': isPreview,
          id,
          name: id,
          placeholder: `${field.properties.defaultValue ?? ''}`,
        }}
        inputName={id}
        value={isPreview ? field.properties.defaultValue : value}
        // NumberInput shows a disabled input if no onChange provided
        onChange={isPreview || !onChange ? () => undefined : onChange}
      />
    )}
  </DataFormFieldGroup>
);

export default NumericFormField;
