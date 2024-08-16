import * as React from 'react';
import { NumericField } from '~/concepts/connectionTypes/types';
import NumberInputWrapper from '~/components/NumberInputWrapper';
import { FieldProps } from '~/concepts/connectionTypes/fields/types';
import DefaultValueTextRenderer from '~/concepts/connectionTypes/fields/DefaultValueTextRenderer';

const NumericFormField: React.FC<FieldProps<NumericField>> = ({
  id,
  field,
  mode,
  onChange,
  value,
  'data-testid': dataTestId,
}) => {
  const isPreview = mode === 'preview';
  return (
    <DefaultValueTextRenderer id={id} field={field} mode={mode}>
      <NumberInputWrapper
        inputProps={{
          'aria-readonly': isPreview,
          id,
          name: id,
          'data-testid': dataTestId,
          placeholder: `${field.properties.defaultValue ?? ''}`,
        }}
        inputName={id}
        value={isPreview ? field.properties.defaultValue : value}
        // NumberInput shows a disabled input if no onChange provided
        onChange={isPreview || !onChange ? () => undefined : onChange}
      />
    </DefaultValueTextRenderer>
  );
};

export default NumericFormField;
