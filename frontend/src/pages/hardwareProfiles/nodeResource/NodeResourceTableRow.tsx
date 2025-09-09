import React from 'react';
import { Td, Tr } from '@patternfly/react-table';
import {
  ActionList,
  ActionListItem,
  Button,
  Flex,
  FlexItem,
  Icon,
  Truncate,
} from '@patternfly/react-core';
import { ExclamationTriangleIcon, MinusCircleIcon, PencilAltIcon } from '@patternfly/react-icons';
import { Identifier } from '#~/types';
import { isHardwareProfileIdentifierValid } from '#~/pages/hardwareProfiles/utils';
import { formatResourceValue } from '#~/concepts/hardwareProfiles/utils';

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
    <Td dataLabel="Resource name">
      <Flex>
        <FlexItem spacer={{ default: 'spacerSm' }}>
          <Truncate content={identifier.displayName} />
        </FlexItem>
        {!isHardwareProfileIdentifierValid(identifier) && (
          <Icon status="warning">
            <ExclamationTriangleIcon />
          </Icon>
        )}
      </Flex>
    </Td>
    <Td dataLabel="Resource identifier">
      <Truncate content={identifier.identifier} />
    </Td>
    <Td dataLabel="Resource type">{identifier.resourceType ?? 'Other'}</Td>
    <Td dataLabel="Default">
      {formatResourceValue(identifier.defaultCount, identifier.resourceType)}
    </Td>
    <Td dataLabel="Minimum allowed">
      {formatResourceValue(identifier.minCount, identifier.resourceType)}
    </Td>
    <Td dataLabel="Maximum allowed">
      {identifier.maxCount
        ? formatResourceValue(identifier.maxCount, identifier.resourceType)
        : 'unrestricted'}
    </Td>
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
