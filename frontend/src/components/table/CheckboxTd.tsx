import * as React from 'react';
import { Td } from '@patternfly/react-table';
import { Checkbox } from '@patternfly/react-core';

type CheckboxTrProps = {
  id: string;
  isChecked: boolean;
  onToggle: () => void;
};

const CheckboxTd: React.FC<CheckboxTrProps> = ({ id, isChecked, onToggle }) => (
  <Td>
    <Checkbox id={`${id}-checkbox`} isChecked={isChecked} onChange={() => onToggle()} />
  </Td>
);

export default CheckboxTd;
