import React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { Identifier } from '~/types';

type NodeResourceTableRowProps = {
  identifier: Identifier;
  onDelete: (identifier: Identifier) => void;
  onEdit: (identifier: Identifier) => void;
};

const NodeResourceTableRow: React.FC<NodeResourceTableRowProps> = ({
  identifier,
  onEdit,
  onDelete,
}) => (
  <Tr>
    <Td dataLabel="Resource lable">{identifier.displayName}</Td>
    <Td dataLabel="Resource identifier">{identifier.identifier}</Td>
    <Td dataLabel="Default">{identifier.defaultCount}</Td>
    <Td dataLabel="Minimum allowed">{identifier.minCount}</Td>
    <Td dataLabel="Maximum allowed">{identifier.maxCount}</Td>
    <Td isActionCell>
      <ActionsColumn
        items={[
          {
            title: 'Edit',
            onClick: () => onEdit(identifier),
          },
          { isSeparator: true },
          {
            title: 'Delete',
            onClick: () => onDelete(identifier),
          },
        ]}
      />
    </Td>
  </Tr>
);

export default NodeResourceTableRow;
