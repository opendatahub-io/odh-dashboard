import * as React from 'react';
import { EnvVariableDataEntry } from '../types';
import { AWS_KEYS, AWS_REQUIRED_KEYS } from './const';
import AWSInputField from './AWSInputField';
import { Stack, StackItem } from '@patternfly/react-core';

type AWSFieldProps = {
  values: EnvVariableDataEntry[];
  onUpdate: (data: EnvVariableDataEntry[]) => void;
};

const AWSField: React.FC<AWSFieldProps> = ({ values, onUpdate }) => {
  const update = (key: AWS_KEYS, value: string) => {
    onUpdate(values.map((d) => (d.key === key ? { key, value } : d)));
  };

  return (
    <Stack hasGutter>
      {Object.values(AWS_KEYS).map((value: AWS_KEYS) => (
        <StackItem key={value}>
          <AWSInputField
            isPassword={value === AWS_KEYS.SECRET_ACCESS_KEY}
            isRequired={AWS_REQUIRED_KEYS.includes(value)}
            onChange={update}
            type={value}
            value={values.find((data) => data.key === value)?.value || ''}
          />
        </StackItem>
      ))}
    </Stack>
  );
};

export default AWSField;
