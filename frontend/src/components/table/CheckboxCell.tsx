import * as React from 'react';
import { Checkbox } from '@patternfly/react-core';

type CheckboxCellProps = {
  id: string;
  isChecked: boolean;
  onToggle: () => void;
};

const CheckboxCell: React.FC<CheckboxCellProps> = ({ id, isChecked, onToggle }) => (
  <Checkbox id={`${id}-checkbox`} isChecked={isChecked} onChange={() => onToggle()} />
);

export default CheckboxCell;
