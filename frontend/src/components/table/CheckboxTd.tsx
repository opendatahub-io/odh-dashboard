import * as React from 'react';
import { Td } from '@patternfly/react-table';
import { Checkbox, Tooltip } from '@patternfly/react-core';

type CheckboxTrProps = {
  id: string;
  isChecked: boolean | null;
  onToggle: () => void;
  isDisabled?: boolean;
  tooltip?: string;
};

const CheckboxTd: React.FC<CheckboxTrProps> = ({
  id,
  isChecked,
  onToggle,
  isDisabled,
  tooltip,
}) => {
  let content = (
    <Checkbox
      aria-label="Checkbox"
      id={`${id}-checkbox`}
      isChecked={isChecked}
      onChange={() => onToggle()}
      isDisabled={isDisabled}
    />
  );

  if (tooltip) {
    content = <Tooltip content={tooltip}>{content}</Tooltip>;
  }

  return <Td dataLabel="Checkbox">{content}</Td>;
};

export default CheckboxTd;
