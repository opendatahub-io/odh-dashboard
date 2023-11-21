import * as React from 'react';
import { Stack, StackItem } from '@patternfly/react-core';
import { FormGroup, TextInput } from '@patternfly/react-core';
import { EnvVariableDataEntry } from '~/pages/projects/types';
import PasswordInput from '~/pages/projects/components/PasswordInput';

export type FieldOptions = {
  key: string;
  label: string;
  placeholder?: string;
  isRequired?: boolean;
  isPassword?: boolean;
};

type FieldListProps = {
  values: EnvVariableDataEntry[];
  onUpdate: (data: EnvVariableDataEntry[]) => void;
  fields: FieldOptions[];
};

type InputFieldProps = {
  options: FieldOptions;
  onChange: (key: FieldOptions['key'], value: string) => void;
  value: string;
};

const FieldListField = ({ options, onChange, value }: InputFieldProps) => {
  const ComponentField = options.isPassword ? PasswordInput : TextInput;

  return (
    <FormGroup isRequired={options.isRequired} label={options.label}>
      <ComponentField
        aria-label={`Field list ${options.key}`}
        isRequired={options.isRequired}
        value={value}
        placeholder={options.placeholder}
        onChange={(e, value) => onChange(options.key, value)}
      />
    </FormGroup>
  );
};

const FieldList = ({ values, onUpdate, fields }: FieldListProps) => {
  const update = (key: FieldOptions['key'], value: string) => {
    onUpdate(values.map((d) => (d.key === key ? { key, value } : d)));
  };

  return (
    <Stack hasGutter>
      {fields.map((field) => (
        <StackItem key={field.key}>
          <FieldListField
            options={field}
            onChange={update}
            value={values.find((data) => data.key === field.key)?.value || ''}
          />
        </StackItem>
      ))}
    </Stack>
  );
};

export default FieldList;
