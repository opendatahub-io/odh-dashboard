import * as React from 'react';
import ValueUnitField from './ValueUnitField';
import { CPU_UNITS } from '../utilities/valueUnits';

type CPUFieldProps = {
  onChange: (newValue: string) => void;
  value?: string;
};

const CPUField: React.FC<CPUFieldProps> = ({ onChange, value = '1' }) => {
  return <ValueUnitField min={1} onChange={onChange} options={CPU_UNITS} value={value} />;
};

export default CPUField;
