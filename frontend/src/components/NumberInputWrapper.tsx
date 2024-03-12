import * as React from 'react';
import { NumberInput } from '@patternfly/react-core';

type NumberInputWrapperProps = {
  onBlur?: (blurValue: number) => void;
  onChange: (newValue: number) => void;
} & Omit<React.ComponentProps<typeof NumberInput>, 'onChange' | 'onPlus' | 'onMinus'>;

const NumberInputWrapper: React.FC<NumberInputWrapperProps> = ({
  onBlur,
  onChange,
  value,
  validated,
  min,
  max,
  ...otherProps
}) => (
  <NumberInput
    {...otherProps}
    min={min}
    max={max}
    validated={validated}
    value={value}
    onChange={(e) => {
      let v = parseInt(e.currentTarget.value);
      if (min) {
        v = Math.max(v, min);
      }
      if (max) {
        v = Math.min(v, max);
      }
      onChange(v);
    }}
    onBlur={
      onBlur &&
      ((e) => {
        onBlur(parseInt(e.currentTarget.value));
      })
    }
    onPlus={() => onChange((value || 0) + 1)}
    onMinus={() => onChange((value || 0) - 1)}
  />
);

export default NumberInputWrapper;
