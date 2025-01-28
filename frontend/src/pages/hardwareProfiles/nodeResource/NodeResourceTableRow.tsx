import React from 'react';
import { Td, Tr } from '@patternfly/react-table';
import { ActionList, ActionListItem, Button, Truncate } from '@patternfly/react-core';
import { MinusCircleIcon, PencilAltIcon } from '@patternfly/react-icons';
import { Identifier } from '~/types';

type NodeResourceTableRowProps = {
  identifier: Identifier;
  onDelete: (identifier: Identifier) => void;
  onEdit: (identifier: Identifier) => void;
  showActions: boolean;
};

const NodeResourceTableRow: React.FC<NodeResourceTableRowProps> = ({
  identifier,
  onEdit,
  onDelete,
  showActions,
}) => (
  <Tr>
    <Td dataLabel="Resource label">
      <Truncate content={identifier.displayName} />
    </Td>
    <Td dataLabel="Resource identifier">
      <Truncate content={identifier.identifier} />
    </Td>
    <Td dataLabel="Resource type">{identifier.resourceType ?? 'Other'}</Td>
    <Td dataLabel="Default">{identifier.defaultCount}</Td>
    <Td dataLabel="Minimum allowed">{identifier.minCount}</Td>
    <Td dataLabel="Maximum allowed">{identifier.maxCount}</Td>
    {showActions && (
      <Td isActionCell modifier="nowrap" style={{ textAlign: 'right' }}>
        <ActionList isIconList>
          <ActionListItem>
            <Button
              icon={<PencilAltIcon />}
              aria-label="Edit node resource"
              variant="plain"
              onClick={() => onEdit(identifier)}
            />
          </ActionListItem>
          <ActionListItem>
            <Button
              icon={<MinusCircleIcon />}
              aria-label="Remove node resource"
              variant="plain"
              onClick={() => onDelete(identifier)}
            />
          </ActionListItem>
        </ActionList>
      </Td>
    )}
  </Tr>
);

export default NodeResourceTableRow;
