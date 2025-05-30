import * as React from 'react';
import { ComponentProps } from 'react';
import { MEMORY_UNITS_FOR_SELECTION } from '#~/utilities/valueUnits';
import ValueUnitField from './ValueUnitField';

type MemoryFieldProps = {
  onChange: (newValue: string) => void;
  value?: string | number;
  validated?: ComponentProps<typeof ValueUnitField>['validated'];
  dataTestId?: string;
  min?: number;
  onBlur?: () => void;
};

const MemoryField: React.FC<MemoryFieldProps> = ({
  value = '1Gi',
  onChange,
  validated,
  dataTestId,
  min = 1,
  onBlur,
}) => (
  <ValueUnitField
    min={min}
    onChange={onChange}
    options={MEMORY_UNITS_FOR_SELECTION}
    value={String(value)}
    validated={validated}
    dataTestId={dataTestId}
    onBlur={onBlur}
  />
);

export default MemoryField;
