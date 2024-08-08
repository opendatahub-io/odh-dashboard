import * as React from 'react';
import { NumberInput } from '@patternfly/react-core';

type NumberInputWrapperProps = {
  onBlur?: (blurValue: number) => void;
  onChange?: (newValue: number) => void;
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
    onChange={
      onChange
        ? (e) => {
            let v = parseInt(e.currentTarget.value);
            if (min) {
              v = Math.max(v, min);
            }
            if (max) {
              v = Math.min(v, max);
            }
            onChange(v);
          }
        : undefined
    }
    onBlur={
      onBlur &&
      ((e) => {
        onBlur(parseInt(e.currentTarget.value));
      })
    }
    onPlus={onChange ? () => onChange((value || 0) + 1) : undefined}
    onMinus={onChange ? () => onChange((value || 0) - 1) : undefined}
  />
);

export default NumberInputWrapper;
