import * as React from 'react';
import { HiddenField } from '~/concepts/connectionTypes/types';
import PasswordInput from '~/components/PasswordInput';
import DataFormFieldGroup from '~/concepts/connectionTypes/fields/DataFormFieldGroup';

type Props = {
  field: HiddenField;
  isPreview?: boolean;
  value?: string;
  onChange?: (value: string) => void;
};

const HiddenFormField: React.FC<Props> = ({ field, isPreview, onChange, value }) => (
  <DataFormFieldGroup field={field} isPreview={!!isPreview}>
    {(id) => (
      <PasswordInput
        aria-readonly={isPreview}
        autoComplete="off"
        isRequired={field.required}
        id={id}
        name={id}
        ariaLabelHide="Hide value"
        ariaLabelShow="Show value"
        value={(isPreview ? field.properties.defaultValue : value) ?? ''}
        onChange={isPreview || !onChange ? undefined : (_e, v) => onChange(v)}
      />
    )}
  </DataFormFieldGroup>
);

export default HiddenFormField;
