import React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { PodToleration } from '~/types';

type TolerationRowProps = {
  toleration: PodToleration;
  onDelete: (toleration: PodToleration) => void;
  onEdit: (toleration: PodToleration) => void;
};

export const TolerationRow: React.FC<TolerationRowProps> = ({ toleration, onEdit, onDelete }) => {
  const formatValue = (value: string | undefined) => value || '-';
  const formatSeconds = (seconds: number | undefined) =>
    seconds !== undefined ? `${seconds} seconds(s)` : '-';

  return (
    <Tr>
      <Td dataLabel="Operator">{formatValue(toleration.operator)}</Td>
      <Td dataLabel="Key">{formatValue(toleration.key)}</Td>
      <Td dataLabel="Value">{formatValue(toleration.value)}</Td>
      <Td dataLabel="Effect">{formatValue(toleration.effect)}</Td>
      <Td dataLabel="Toleration Seconds">{formatSeconds(toleration.tolerationSeconds)}</Td>
      <Td isActionCell>
        <ActionsColumn
          items={[
            {
              title: 'Edit',
              onClick: () => onEdit(toleration),
            },
            {
              title: 'Delete',
              onClick: () => onDelete(toleration),
            },
          ]}
        />
      </Td>
    </Tr>
  );
};

export default TolerationRow;
