import * as React from 'react';
// eslint-disable-next-line no-restricted-imports
import { NumberInput } from '@patternfly/react-core';

import './NumberInputWrapper.scss';

type NumberInputWrapperProps = {
  onBlur?: (blurValue: number | undefined) => void;
  onChange?: (newValue: number | undefined) => void;
  intOnly?: boolean;
  fullWidth?: boolean;
} & Omit<React.ComponentProps<typeof NumberInput>, 'onChange' | 'onPlus' | 'onMinus'>;

const NumberInputWrapper: React.FC<NumberInputWrapperProps> = ({
  onBlur,
  onChange,
  intOnly = true,
  fullWidth = false,
  value,
  validated,
  min,
  max,
  ...otherProps
}) => (
  <NumberInput
    className={fullWidth ? 'odh-number-input-wrapper m-full-width' : undefined}
    inputProps={{ placeholder: '' }}
    inputName="value-unit-input"
    {...otherProps}
    min={min}
    max={max}
    validated={validated}
    value={value}
    onChange={
      onChange
        ? (e) => {
            if (e.type === 'change') {
              let v: number = intOnly
                ? parseInt(e.currentTarget.value)
                : parseFloat(e.currentTarget.value);
              if (Number.isNaN(v)) {
                e.currentTarget.value = '';
                onChange(undefined);
                return;
              }
              if (min) {
                v = Math.max(v, min);
              }
              if (max) {
                v = Math.min(v, max);
              }
              onChange(v);
            }
          }
        : undefined
    }
    onBlur={(e) => {
      // eslint-disable-next-line no-param-reassign
      e.target.value = value ?? '';
      if (onBlur) {
        onBlur(value);
      }
    }}
    onPlus={
      onChange
        ? () => {
            const newVal = (value || 0) + 1;
            onChange(min ? Math.max(newVal, min) : newVal);
          }
        : undefined
    }
    onMinus={
      onChange
        ? () => {
            const newVal = (value || 0) - 1;
            onChange(max ? Math.min(newVal, max) : newVal);
          }
        : undefined
    }
  />
);
export default NumberInputWrapper;
