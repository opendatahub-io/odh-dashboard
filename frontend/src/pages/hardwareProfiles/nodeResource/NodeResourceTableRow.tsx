import React from 'react';
import { Td, Tr } from '@patternfly/react-table';
import { ActionList, ActionListItem, Button, Tooltip } from '@patternfly/react-core';
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
}) => {
  const isRemoveDisabled = identifier.identifier === 'cpu' || identifier.identifier === 'memory';
  const tooltipRef = React.useRef();
  return (
    <Tr>
      <Td dataLabel="Resource label">{identifier.displayName}</Td>
      <Td dataLabel="Resource identifier">{identifier.identifier}</Td>
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
                isAriaDisabled={isRemoveDisabled}
                ref={tooltipRef}
                onClick={() => onDelete(identifier)}
              />
              {isRemoveDisabled && (
                <Tooltip
                  content={
                    <>
                      A hardware profile must include CPU and RAM resources. These resources can be
                      edited but can&apos;t be deleted.
                    </>
                  }
                  triggerRef={tooltipRef}
                />
              )}
            </ActionListItem>
          </ActionList>
        </Td>
      )}
    </Tr>
  );
};

export default NodeResourceTableRow;
