import { TextInput } from '@patternfly/react-core';
import React from 'react';
import NumberInputWrapper from '~/components/NumberInputWrapper';
import { InputParamProps } from './types';

interface NumberInputParamProps extends InputParamProps {
  isFloat?: boolean;
}

export const NumberInputParam: React.FC<NumberInputParamProps> = ({
  isFloat,
  onChange,
  ...inputProps
}) => {
  const [value, setValue] = React.useState<number | ''>(
    inputProps.value !== '' ? Number(inputProps.value) : '',
  );

  if (isFloat) {
    return (
      <TextInput
        {...inputProps}
        type="number"
        step={0.1}
        value={value}
        onChange={(event, newValue) => {
          setValue(typeof newValue === 'string' ? parseFloat(newValue) : newValue);
          onChange(event, newValue);
        }}
      />
    );
  }

  return (
    <NumberInputWrapper
      {...inputProps}
      value={value}
      onChange={(newValue) => {
        setValue(newValue);
        onChange(null, newValue);
      }}
    />
  );
};
