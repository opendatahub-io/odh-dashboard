import * as React from 'react';
import { FormGroup, TextInput } from '@patternfly/react-core';
import PasswordInput from '~/pages/projects/components/PasswordInput';
import { DATABASE_CONNECTION_KEYS } from './const';

type DatabaseConnectionInputFieldProps = {
  isPassword?: boolean;
  isRequired: boolean;
  onChange: (key: DATABASE_CONNECTION_KEYS, value: string) => void;
  type: DATABASE_CONNECTION_KEYS;
  value: string;
};

const DatabaseConnectionInputField: React.FC<DatabaseConnectionInputFieldProps> = ({
  isPassword,
  isRequired,
  onChange,
  type,
  value,
}) => {
  const ComponentField = isPassword ? PasswordInput : TextInput;

  return (
    <FormGroup isRequired={isRequired} label={type}>
      <ComponentField
        aria-label={`Database connection field ${type}`}
        isRequired={isRequired}
        value={value}
        onChange={(value) => onChange(type, value)}
      />
    </FormGroup>
  );
};

export default DatabaseConnectionInputField;
