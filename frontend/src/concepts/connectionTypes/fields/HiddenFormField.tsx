import * as React from 'react';
import { HiddenField } from '~/concepts/connectionTypes/types';
import PasswordInput from '~/components/PasswordInput';
import { FieldProps } from '~/concepts/connectionTypes/fields/types';
import DefaultValueTextRenderer from '~/concepts/connectionTypes/fields/DefaultValueTextRenderer';

const HiddenFormField: React.FC<FieldProps<HiddenField>> = ({
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
      <PasswordInput
        aria-readonly={isPreview}
        autoComplete="off"
        isRequired={field.required}
        id={id}
        name={id}
        data-testid={dataTestId}
        ariaLabelHide="Hide value"
        ariaLabelShow="Show value"
        value={(isPreview ? field.properties.defaultValue : value) ?? ''}
        onChange={isPreview || !onChange ? undefined : (_e, v) => onChange(v)}
      />
    </DefaultValueTextRenderer>
  );
};

export default HiddenFormField;
