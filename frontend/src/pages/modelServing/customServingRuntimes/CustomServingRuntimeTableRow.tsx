import * as React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { useNavigate } from 'react-router-dom';
import { TemplateKind } from '~/k8sTypes';
import { TrDragFunctionsType } from '~/utilities/useDraggableTable';
import CustomServingRuntimeEnabledToggle from './CustomServingRuntimeEnabledToggle';
import {
  getServingRuntimeDisplayNameFromTemplate,
  getServingRuntimeNameFromTemplate,
} from './utils';

type CustomServingRuntimeTableRowProps = {
  obj: TemplateKind;
  rowIndex: number;
  rowId: string;
  dragFunctions?: TrDragFunctionsType;
  onDeleteTemplate: (obj: TemplateKind) => void;
};

const CustomServingRuntimeTableRow: React.FC<CustomServingRuntimeTableRowProps> = ({
  obj: template,
  rowIndex,
  rowId,
  dragFunctions,
  onDeleteTemplate,
}) => {
  const navigate = useNavigate();
  if (!dragFunctions) {
    return null;
  }
  const { onDragEnd, onDragStart, onDrop } = dragFunctions;
  return (
    <Tr
      key={rowIndex}
      id={rowId}
      draggable
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onDragStart={onDragStart}
    >
      <Td
        draggableRow={{
          id: `draggable-row-${rowId}`,
        }}
      />
      <Td dataLabel="Name">{getServingRuntimeDisplayNameFromTemplate(template)}</Td>
      <Td dataLabel="Enabled">
        <CustomServingRuntimeEnabledToggle template={template} />
      </Td>
      <Td isActionCell>
        <ActionsColumn
          items={[
            {
              title: 'Edit',
              onClick: () =>
                navigate(
                  `/servingRuntimes/editServingRuntime/${getServingRuntimeNameFromTemplate(
                    template,
                  )}`,
                ),
            },
            {
              title: 'Delete',
              onClick: () => onDeleteTemplate(template),
            },
          ]}
        />
      </Td>
    </Tr>
  );
};

export default CustomServingRuntimeTableRow;
