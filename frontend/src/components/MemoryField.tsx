import * as React from 'react';
import ValueUnitField from './ValueUnitField';
import { MEMORY_UNITS } from '../utilities/valueUnits';

type MemoryFieldProps = {
  onChange: (newValue: string) => void;
  value?: string;
};

const MemoryField: React.FC<MemoryFieldProps> = ({ onChange, value = '1Gi' }) => {
  return <ValueUnitField min={1} onChange={onChange} options={MEMORY_UNITS} value={value} />;
};

export default MemoryField;
