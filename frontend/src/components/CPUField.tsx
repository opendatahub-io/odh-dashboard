import * as React from 'react';
import { CPU_UNITS } from '~/utilities/valueUnits';
import ValueUnitField from './ValueUnitField';

type CPUFieldProps = {
  onChange: (newValue: string) => void;
  value?: string;
};

const CPUField: React.FC<CPUFieldProps> = ({ onChange, value = '1' }) => (
  <ValueUnitField min={1} onChange={onChange} options={CPU_UNITS} value={value} />
);

export default CPUField;
