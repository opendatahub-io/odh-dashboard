import * as React from 'react';
import { ComponentProps } from 'react';
import { Stack, Checkbox, Tooltip } from '@patternfly/react-core';
import { ZodIssue } from 'zod';
import { CPU_UNITS } from '#~/utilities/valueUnits';
import { ZodErrorHelperText } from '#~/components/ZodErrorFormHelperText';
import ValueUnitField from './ValueUnitField';

type CPUFieldProps = {
  onChange: (newValue: string | undefined) => void;
  value?: string | number;
  validated?: ComponentProps<typeof ValueUnitField>['validated'];
  dataTestId?: string;
  min?: number | string;
  max?: number | string;
  onBlur?: () => void;
  isDisabled?: boolean;
};

type CPUFieldWithCheckboxProps = Omit<CPUFieldProps, 'onBlur'> & {
  checkboxId: string;
  label: string;
  checkboxTooltip?: string;
  zodIssue?: ZodIssue | ZodIssue[];
};

const CPUField: React.FC<CPUFieldProps> = ({
  onChange,
  value,
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
    options={CPU_UNITS}
    value={value ? String(value) : ''}
    validated={validated}
    dataTestId={dataTestId}
    onBlur={onBlur}
    isDisabled={isDisabled}
  />
);

export const CPUFieldWithCheckbox: React.FC<CPUFieldWithCheckboxProps> = ({
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
            onChange(undefined);
          } else {
            onChange(storedValue.current ? String(storedValue.current) : '1');
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
      <CPUField
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

export default CPUField;
