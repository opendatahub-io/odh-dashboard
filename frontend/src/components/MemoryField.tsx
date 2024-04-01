import * as React from 'react';
import { MEMORY_UNITS_FOR_SELECTION } from '~/utilities/valueUnits';
import ValueUnitField from './ValueUnitField';

type MemoryFieldProps = {
  onChange: (newValue: string) => void;
  value?: string;
};

const MemoryField: React.FC<MemoryFieldProps> = ({ onChange, value = '1Gi' }) => (
  <ValueUnitField min={1} onChange={onChange} options={MEMORY_UNITS_FOR_SELECTION} value={value} />
);

export default MemoryField;
