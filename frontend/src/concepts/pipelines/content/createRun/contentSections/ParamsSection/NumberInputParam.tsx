import { TextInput } from '@patternfly/react-core';
import React, { ComponentProps, useRef } from 'react';
import NumberInputWrapper from '#~/components/NumberInputWrapper';
import { InputParamProps } from './types';

interface NumberInputParamProps extends InputParamProps {
  isFloat?: boolean;
  validated?: ComponentProps<typeof TextInput>['validated'];
  isDisabled?: boolean;
}

export const NumberInputParam: React.FC<NumberInputParamProps> = ({
  isFloat,
  onChange,
  validated,
  isDisabled,
  ...inputProps
}) => {
  const [value, setValue] = React.useState<number | string>(
    inputProps.value !== '' ? Number(inputProps.value) : '',
  );
  const isDefault = useRef(true);

  const handleUnknownValue = React.useCallback(
    (event: React.ChangeEvent<unknown>, val: string) => {
      if (val === '') {
        onChange(event, '');
        setValue('');
        return;
      }

      const num = Number(val);
      const newValue = Number.isNaN(num) ? val : num;
      onChange(event, newValue);
      setValue(newValue);
    },
    [onChange],
  );

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
        validated={validated}
        onChange={(event, newValue) => {
          isDefault.current = false;
          handleUnknownValue(event, newValue);
        }}
        isDisabled={isDisabled}
      />
    );
  }

  return (
    <NumberInputWrapper
      {...inputProps}
      isDisabled={isDisabled}
      data-testid={inputProps.id}
      value={typeof value === 'number' ? value : ''}
      onChange={(newValue) => {
        setValue(newValue ?? 0);
        onChange(null, newValue ?? 0);
      }}
    />
  );
};
