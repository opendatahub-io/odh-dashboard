import React from 'react';
import { Td, Tr } from '@patternfly/react-table';
import { Table } from '~/components/table';
import { NodeSelector } from '~/types';
import { nodeSelectorColumns } from '~/pages/hardwareProfiles/const';

type NodeSelectorTableProps = {
  nodeSelectors: NodeSelector[];
};

const NodeSelectorTable: React.FC<NodeSelectorTableProps> = ({ nodeSelectors }) => (
  <Table
    variant="compact"
    data-testid="hardware-profile-node-selectors-table"
    id="hardware-profile-node-selectors-table"
    data={nodeSelectors}
    columns={nodeSelectorColumns}
    rowRenderer={(cr, index) => (
      <Tr key={index}>
        <Td dataLabel="Key">{cr.key}</Td>
        <Td dataLabel="Value">{cr.value}</Td>
      </Tr>
    )}
  />
);

export default NodeSelectorTable;
