import * as React from 'react';
import { ComponentProps } from 'react';
import { Checkbox, Stack, Tooltip } from '@patternfly/react-core';
import { ZodIssue } from 'zod';
import { MEMORY_UNITS_FOR_SELECTION } from '#~/utilities/valueUnits';
import { ZodErrorHelperText } from '#~/components/ZodErrorFormHelperText';
import ValueUnitField from './ValueUnitField';

type MemoryFieldProps = {
  onChange: (newValue: string | undefined) => void;
  value?: string | number;
  validated?: ComponentProps<typeof ValueUnitField>['validated'];
  dataTestId?: string;
  min?: number | string;
  max?: number | string;
  onBlur?: () => void;
  isDisabled?: boolean;
};

type MemoryFieldWithCheckboxProps = Omit<MemoryFieldProps, 'onBlur'> & {
  checkboxId: string;
  label: string;
  checkboxTooltip?: string;
  zodIssue?: ZodIssue | ZodIssue[];
};

const MemoryField: React.FC<MemoryFieldProps> = ({
  value,
  onChange,
  validated,
  dataTestId,
  min = 1,
  max,
  onBlur,
  isDisabled,
}) => (
  <ValueUnitField
    min={min}
    max={max}
    onChange={onChange}
    options={MEMORY_UNITS_FOR_SELECTION}
    value={value ? String(value) : 'Gi'}
    validated={validated}
    dataTestId={dataTestId}
    onBlur={onBlur}
    isDisabled={isDisabled}
  />
);

export const MemoryFieldWithCheckbox: React.FC<MemoryFieldWithCheckboxProps> = ({
  checkboxId,
  onChange,
  value,
  validated,
  zodIssue,
  dataTestId,
  min = 1,
  max,
  label,
  isDisabled,
  checkboxTooltip,
}) => {
  const isChecked = value !== undefined;

  // Store the value when the checkbox is unchecked to restore it when the checkbox is checked again
  const storedValue = React.useRef(value);

  return (
    <Stack hasGutter>
      <Checkbox
        id={checkboxId}
        data-testid={checkboxId}
        isChecked={isChecked}
        onChange={(_, checked) => {
          if (!checked) {
            onChange(undefined);
          } else {
            onChange(storedValue.current ? String(storedValue.current) : '1Gi');
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
      <MemoryField
        onChange={onChange}
        value={value}
        validated={validated}
        dataTestId={dataTestId}
        min={min}
        max={max}
        onBlur={() => {
          storedValue.current = value;
        }}
        isDisabled={!isChecked || isDisabled}
      />
      <ZodErrorHelperText zodIssue={zodIssue} />
    </Stack>
  );
};

export default MemoryField;
