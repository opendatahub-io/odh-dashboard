import * as React from 'react';
import { ComponentProps } from 'react';
import { CPU_UNITS } from '~/utilities/valueUnits';
import ValueUnitField from './ValueUnitField';

type CPUFieldProps = {
  onChange: (newValue: string) => void;
  value?: string | number;
  validated?: ComponentProps<typeof ValueUnitField>['validated'];
  dataTestId?: string;
  min?: number;
};

const CPUField: React.FC<CPUFieldProps> = ({
  onChange,
  value = '1',
  validated,
  dataTestId,
  min = 1,
}) => (
  <ValueUnitField
    min={min}
    onChange={onChange}
    options={CPU_UNITS}
    value={String(value)}
    validated={validated}
    dataTestId={dataTestId}
  />
);

export default CPUField;
