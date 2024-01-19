import * as React from 'react';
import { Td } from '@patternfly/react-table';
import { Checkbox } from '@patternfly/react-core';

type CheckboxTrProps = {
  id: string;
  isChecked: boolean | null;
  onToggle: () => void;
  isDisabled?: boolean;
};

const CheckboxTd: React.FC<CheckboxTrProps> = ({ id, isChecked, onToggle, isDisabled }) => (
  <Td>
    <Checkbox
      id={`${id}-checkbox`}
      isChecked={isChecked}
      onChange={() => onToggle()}
      isDisabled={isDisabled}
    />
  </Td>
);

export default CheckboxTd;
