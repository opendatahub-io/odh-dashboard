import * as React from 'react';
import { TextInput } from '@patternfly/react-core';
import { ShortTextField } from '~/concepts/connectionTypes/types';
import DataFormFieldGroup from '~/concepts/connectionTypes/fields/DataFormFieldGroup';

type Props = {
  field: ShortTextField;
  isPreview?: boolean;
  value?: string;
  onChange?: (value: string) => void;
};

const ShortTextFormField: React.FC<Props> = ({ field, isPreview, onChange, value }) => (
  <DataFormFieldGroup field={field} isPreview={!!isPreview}>
    {(id) => (
      <TextInput
        aria-readonly={isPreview}
        autoComplete="off"
        isRequired={field.required}
        id={id}
        name={id}
        value={(isPreview ? field.properties.defaultValue : value) ?? ''}
        onChange={isPreview || !onChange ? undefined : (_e, v) => onChange(v)}
      />
    )}
  </DataFormFieldGroup>
);

export default ShortTextFormField;
