import { TextInput } from '@patternfly/react-core';
import React, { useRef } from 'react';
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
  const isDefault = useRef(true);

  if (isFloat) {
    // if the default value is a whole number, display it as x.0
    const displayValue =
      typeof value === 'number' && Number.isInteger(value) && isDefault.current
        ? value.toFixed(1)
        : value;

    return (
      <TextInput
        {...inputProps}
        data-testid={inputProps.id}
        type="number"
        step={0.1}
        value={displayValue}
        onChange={(event, newValue) => {
          isDefault.current = false;
          setValue(typeof newValue === 'string' ? parseFloat(newValue) : newValue);
          onChange(event, newValue);
        }}
      />
    );
  }

  return (
    <NumberInputWrapper
      {...inputProps}
      data-testid={inputProps.id}
      value={value}
      onChange={(newValue) => {
        setValue(newValue ?? 0);
        onChange(null, newValue ?? 0);
      }}
    />
  );
};
