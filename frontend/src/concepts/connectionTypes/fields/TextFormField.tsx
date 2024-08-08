import * as React from 'react';
import { TextArea } from '@patternfly/react-core';
import { TextField } from '~/concepts/connectionTypes/types';
import DataFormFieldGroup from '~/concepts/connectionTypes/fields/DataFormFieldGroup';

type Props = {
  field: TextField;
  isPreview?: boolean;
  value?: string;
  onChange?: (value: string) => void;
};

const TextFormField: React.FC<Props> = ({ field, isPreview, onChange, value }) => (
  <DataFormFieldGroup field={field} isPreview={!!isPreview}>
    {(id) => (
      <TextArea
        aria-readonly={isPreview}
        autoComplete="off"
        isRequired={field.required}
        id={id}
        name={id}
        resizeOrientation="vertical"
        value={(isPreview ? field.properties.defaultValue : value) ?? ''}
        onChange={isPreview || !onChange ? undefined : (_e, v) => onChange(v)}
      />
    )}
  </DataFormFieldGroup>
);

export default TextFormField;
