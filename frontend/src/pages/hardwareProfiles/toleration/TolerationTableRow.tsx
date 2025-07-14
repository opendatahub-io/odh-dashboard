import React from 'react';
import { Td, Tr } from '@patternfly/react-table';
import { ActionList, ActionListItem, Button, Truncate } from '@patternfly/react-core';
import { MinusCircleIcon, PencilAltIcon } from '@patternfly/react-icons';
import { Toleration } from '#~/types';

type TolerationTableRowProps = {
  toleration: Toleration;
  showActions: boolean;
  onEdit: (toleration: Toleration) => void;
  onDelete: (toleration: Toleration) => void;
};

const TolerationTableRow: React.FC<TolerationTableRowProps> = ({
  toleration,
  showActions,
  onEdit,
  onDelete,
}) => (
  <Tr>
    <Td dataLabel="Operator">{toleration.operator ?? '-'}</Td>
    <Td dataLabel="Key">
      <Truncate content={toleration.key} />
    </Td>
    <Td dataLabel="Value">
      <Truncate content={toleration.value ?? '-'} />
    </Td>
    <Td dataLabel="Effect">{toleration.effect ?? '-'}</Td>
    <Td dataLabel="Toleration seconds">
      {toleration.tolerationSeconds === undefined
        ? '-'
        : `${toleration.tolerationSeconds} second(s)`}
    </Td>
    {showActions && (
      <Td isActionCell modifier="nowrap" style={{ textAlign: 'right' }}>
        <ActionList isIconList>
          <ActionListItem>
            <Button
              icon={<PencilAltIcon />}
              aria-label="Edit toleration"
              variant="plain"
              onClick={() => onEdit(toleration)}
            />
          </ActionListItem>
          <ActionListItem>
            <Button
              icon={<MinusCircleIcon />}
              aria-label="Remove toleration"
              variant="plain"
              onClick={() => onDelete(toleration)}
            />
          </ActionListItem>
        </ActionList>
      </Td>
    )}
  </Tr>
);

export default TolerationTableRow;
