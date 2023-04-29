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
  trDragFunctions: TrDragFunctionsType;
  onDeleteTemplate: (obj: TemplateKind) => void;
};

const CustomServingRuntimeTableRow: React.FC<CustomServingRuntimeTableRowProps> = ({
  obj: template,
  rowIndex,
  trDragFunctions,
  onDeleteTemplate,
}) => {
  const navigate = useNavigate();
  const { onDragEnd, onDragStart, onDrop } = trDragFunctions;
  const servingRuntimeName = getServingRuntimeNameFromTemplate(template);

  return (
    <Tr
      key={rowIndex}
      id={servingRuntimeName}
      draggable
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onDragStart={onDragStart}
    >
      <Td
        draggableRow={{
          id: `draggable-row-${servingRuntimeName}`,
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
              onClick: () => navigate(`/servingRuntimes/editServingRuntime/${servingRuntimeName}`),
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
