import React from 'react';
import { Td, Tr } from '@patternfly/react-table';
import { Table } from '~/components/table';
import { Identifier } from '~/types';
import { nodeResourceColumns } from '~/pages/hardwareProfiles/const';

type NodeResourceTableProps = {
  nodeResources: Identifier[];
};

const NodeResourceTable: React.FC<NodeResourceTableProps> = ({ nodeResources }) => (
  <Table
    variant="compact"
    data-testid="hardware-profile-node-resources-table"
    id="hardware-profile-node-resources-table"
    data={nodeResources}
    columns={nodeResourceColumns}
    rowRenderer={(cr, index) => (
      <Tr key={index}>
        <Td dataLabel="Resource label">{cr.displayName}</Td>
        <Td dataLabel="Resource identifier">{cr.identifier}</Td>
        <Td dataLabel="Default">{cr.defaultCount}</Td>
        <Td dataLabel="Minimum allowed">{cr.minCount}</Td>
        <Td dataLabel="Maximum allowed">{cr.maxCount}</Td>
      </Tr>
    )}
  />
);

export default NodeResourceTable;
