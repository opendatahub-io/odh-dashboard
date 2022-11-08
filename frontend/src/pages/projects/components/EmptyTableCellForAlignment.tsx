import * as React from 'react';
import { Td } from '@patternfly/react-table';

const EmptyTableCellForAlignment: React.FC = () => {
  return (
    // This cell is used to align with the other lists which have a toggle button
    <Td className="pf-c-table__toggle">
      <div style={{ width: 46 }} />
    </Td>
  );
};

export default EmptyTableCellForAlignment;
