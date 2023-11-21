import * as React from 'react';
import { CPU_UNITS } from '~/utilities/valueUnits';
import ValueUnitField from './ValueUnitField';

type CPUFieldProps = {
  onChange: (newValue: string) => void;
  value?: string | number;
};

const CPUField: React.FC<CPUFieldProps> = ({ onChange, value = '1' }) => (
  <ValueUnitField min={1} onChange={onChange} options={CPU_UNITS} value={String(value)} />
);

export default CPUField;
