import React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { Identifier } from '~/types';

type NodeResourceTableRowProps = {
  identifier: Identifier;
  onDelete: (identifier: Identifier) => void;
  onEdit: (identifier: Identifier) => void;
  showKebab: boolean;
};

const NodeResourceTableRow: React.FC<NodeResourceTableRowProps> = ({
  identifier,
  onEdit,
  onDelete,
  showKebab,
}) => (
  <Tr>
    <Td dataLabel="Resource label">{identifier.displayName}</Td>
    <Td dataLabel="Resource identifier">{identifier.identifier}</Td>
    <Td dataLabel="Default">{identifier.defaultCount}</Td>
    <Td dataLabel="Minimum allowed">{identifier.minCount}</Td>
    <Td dataLabel="Maximum allowed">{identifier.maxCount}</Td>
    {!showKebab && (
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
              isAriaDisabled: identifier.identifier === 'cpu' || identifier.identifier === 'memory',
            },
          ]}
        />
      </Td>
    )}
  </Tr>
);

export default NodeResourceTableRow;
