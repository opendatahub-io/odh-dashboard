import * as React from 'react';
import { NumberInput } from '@patternfly/react-core';

type NumberInputWrapperProps = {
  onChange: (newValue: number) => void;
  value: number;
} & Omit<React.ComponentProps<typeof NumberInput>, 'onChange' | 'value' | 'onPlus' | 'onMinus'>;

const NumberInputWrapper: React.FC<NumberInputWrapperProps> = ({
  onChange,
  value,
  ...otherProps
}) => {
  return (
    <NumberInput
      {...otherProps}
      value={value}
      onChange={(e) => {
        onChange(parseInt(e.currentTarget.value));
      }}
      onPlus={() => onChange(value + 1)}
      onMinus={() => onChange(value - 1)}
    />
  );
};

export default NumberInputWrapper;
