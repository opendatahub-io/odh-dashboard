import React from 'react';
import { Td, Tr } from '@patternfly/react-table';
import { ActionList, ActionListItem, Button, Truncate } from '@patternfly/react-core';
import { MinusCircleIcon, PencilAltIcon } from '@patternfly/react-icons';
import { NodeSelectorRow } from './const';

type NodeSelectorTableRowProps = {
  nodeSelector: NodeSelectorRow;
  showActions: boolean;
  onEdit: (nodeSelector: NodeSelectorRow) => void;
  onDelete: (nodeSelector: NodeSelectorRow) => void;
};

const NodeSelectorTableRow: React.FC<NodeSelectorTableRowProps> = ({
  nodeSelector,
  showActions,
  onEdit,
  onDelete,
}) => (
  <Tr>
    <Td dataLabel="Key">
      <Truncate content={nodeSelector.key} />
    </Td>
    <Td dataLabel="Value">
      <Truncate content={nodeSelector.value} />
    </Td>
    {showActions && (
      <Td isActionCell modifier="nowrap" style={{ textAlign: 'right' }}>
        <ActionList isIconList>
          <ActionListItem>
            <Button
              icon={<PencilAltIcon />}
              aria-label="Edit node selector"
              variant="plain"
              onClick={() => onEdit(nodeSelector)}
            />
          </ActionListItem>
          <ActionListItem>
            <Button
              icon={<MinusCircleIcon />}
              aria-label="Remove node selector"
              variant="plain"
              onClick={() => onDelete(nodeSelector)}
            />
          </ActionListItem>
        </ActionList>
      </Td>
    )}
  </Tr>
);

export default NodeSelectorTableRow;
