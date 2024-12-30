import React from 'react';
import { Td, Tr } from '@patternfly/react-table';
import { Table } from '~/components/table';
import { Toleration } from '~/types';
import { tolerationColumns } from '~/pages/hardwareProfiles/const';

type TolerationTableProps = {
  tolerations: Toleration[];
};

const TolerationTable: React.FC<TolerationTableProps> = ({ tolerations }) => (
  <Table
    variant="compact"
    data-testid="hardware-profile-tolerations-table"
    id="hardware-profile-tolerations-table"
    data={tolerations}
    columns={tolerationColumns}
    rowRenderer={(cr, index) => (
      <Tr key={index}>
        <Td dataLabel="Operator">{cr.operator ?? '-'}</Td>
        <Td dataLabel="Key">{cr.key}</Td>
        <Td dataLabel="Value">{cr.value ?? '-'}</Td>
        <Td dataLabel="Effect">{cr.effect ?? '-'}</Td>
        <Td dataLabel="Toleration seconds">
          {cr.tolerationSeconds === undefined ? '-' : `${cr.tolerationSeconds} second(s)`}
        </Td>
      </Tr>
    )}
  />
);

export default TolerationTable;
