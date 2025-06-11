import * as React from 'react';
import { ComponentProps } from 'react';
import { CPU_UNITS } from '#~/utilities/valueUnits';
import ValueUnitField from './ValueUnitField';

type CPUFieldProps = {
  onChange: (newValue: string) => void;
  value?: string | number;
  validated?: ComponentProps<typeof ValueUnitField>['validated'];
  dataTestId?: string;
  min?: number | string;
  max?: number | string;
  onBlur?: () => void;
};

const CPUField: React.FC<CPUFieldProps> = ({
  onChange,
  value = '1',
  validated,
  dataTestId,
  min = 1,
  max,
  onBlur,
}) => (
  <ValueUnitField
    min={min}
    max={max}
    onChange={onChange}
    options={CPU_UNITS}
    value={String(value)}
    validated={validated}
    dataTestId={dataTestId}
    onBlur={onBlur}
  />
);

export default CPUField;
