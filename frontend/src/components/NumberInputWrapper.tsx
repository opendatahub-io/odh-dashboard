import * as React from 'react';
import { NumberInput } from '@patternfly/react-core';

type NumberInputWrapperProps = {
  onBlur?: (blurValue: number) => void;
  onChange: (newValue: number) => void;
  value: number;
} & Omit<React.ComponentProps<typeof NumberInput>, 'onChange' | 'value' | 'onPlus' | 'onMinus'>;

const NumberInputWrapper: React.FC<NumberInputWrapperProps> = ({
  onBlur,
  onChange,
  value,
  validated,
  ...otherProps
}) => (
  <NumberInput
    {...otherProps}
    validated={validated}
    value={value}
    onChange={(e) => {
      onChange(parseInt(e.currentTarget.value));
    }}
    onBlur={
      onBlur &&
      ((e) => {
        onBlur(parseInt(e.currentTarget.value));
      })
    }
    onPlus={() => onChange(value + 1)}
    onMinus={() => onChange(value - 1)}
  />
);

export default NumberInputWrapper;
