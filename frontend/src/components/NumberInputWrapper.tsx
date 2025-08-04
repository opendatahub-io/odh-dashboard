import * as React from 'react';
// eslint-disable-next-line no-restricted-imports
import { NumberInput, Stack, Checkbox, Tooltip } from '@patternfly/react-core';
import { ZodIssue } from 'zod';
import { ZodErrorHelperText } from '#~/components/ZodErrorFormHelperText';

import './NumberInputWrapper.scss';

type NumberInputWrapperProps = {
  onBlur?: (blurValue: number | undefined) => void;
  onChange?: (newValue: number | undefined) => void;
  intOnly?: boolean;
  fullWidth?: boolean;
  dataTestId?: string;
  value?: number | '';
  isDisabled?: boolean;
} & Omit<React.ComponentProps<typeof NumberInput>, 'onChange' | 'onPlus' | 'onMinus' | 'value'>;

type NumberInputWrapperWithCheckboxProps = Omit<NumberInputWrapperProps, 'onBlur'> & {
  checkboxId: string;
  label: string;
  checkboxTooltip?: string;
  zodIssue?: ZodIssue | ZodIssue[];
};

const NumberInputWrapper: React.FC<NumberInputWrapperProps> = ({
  onBlur,
  onChange,
  intOnly = true,
  fullWidth = false,
  value,
  validated,
  min,
  max,
  isDisabled,
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
    isDisabled={isDisabled}
  />
);

export const NumberInputWrapperWithCheckbox: React.FC<NumberInputWrapperWithCheckboxProps> = ({
  checkboxId,
  onChange,
  value,
  validated,
  zodIssue,
  dataTestId,
  min,
  max,
  label,
  isDisabled,
  checkboxTooltip,
  intOnly = true,
  fullWidth = false,
  ...otherProps
}) => {
  const isChecked = value !== undefined;

  const storedValue = React.useRef(value);

  React.useEffect(() => {
    if (value !== undefined) {
      storedValue.current = value;
    }
  }, [value]);

  return (
    <Stack hasGutter>
      <Checkbox
        id={checkboxId}
        data-testid={checkboxId}
        isChecked={isChecked}
        onChange={(_, checked) => {
          if (!checked) {
            onChange?.(undefined);
          } else {
            onChange?.(
              storedValue.current !== '' && storedValue.current !== undefined
                ? storedValue.current
                : min ?? 1,
            );
          }
        }}
        isDisabled={isDisabled}
        label={
          checkboxTooltip ? (
            <Tooltip content={checkboxTooltip}>
              <strong>{label}</strong>
            </Tooltip>
          ) : (
            <strong>{label}</strong>
          )
        }
      />
      <NumberInputWrapper
        onChange={onChange}
        value={value}
        validated={validated}
        min={min}
        max={max}
        onBlur={() => {
          storedValue.current = value;
        }}
        isDisabled={!isChecked || isDisabled}
        intOnly={intOnly}
        fullWidth={fullWidth}
        data-testid={dataTestId}
        {...otherProps}
      />
      <ZodErrorHelperText zodIssue={zodIssue} />
    </Stack>
  );
};

export default NumberInputWrapper;
