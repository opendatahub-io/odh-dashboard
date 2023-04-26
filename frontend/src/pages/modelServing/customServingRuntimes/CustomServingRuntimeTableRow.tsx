import * as React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { useNavigate } from 'react-router-dom';
import { TemplateKind } from '~/k8sTypes';
import { TrDragFunctionsType } from '~/utilities/useDraggableTable';
import CustomServingRuntimeEnabledToggle from '~/pages/modelServing/customServingRuntimes/CustomServingRuntimeEnabledToggle';
import { getTemplateDisplayName } from './utils';

type CustomServingRuntimeTableRowProps = {
  obj: TemplateKind;
  rowIndex: number;
  dragFunctions?: TrDragFunctionsType;
  onDeleteTemplate: (obj: TemplateKind) => void;
};

const CustomServingRuntimeTableRow: React.FC<CustomServingRuntimeTableRowProps> = ({
  obj: template,
  rowIndex,
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
      id={template.metadata.name}
      draggable
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onDragStart={onDragStart}
    >
      <Td
        draggableRow={{
          id: `draggable-row-${template.metadata.name}`,
        }}
      />
      <Td dataLabel="Name">{getTemplateDisplayName(template)}</Td>
      <Td dataLabel="Enabled">
        <CustomServingRuntimeEnabledToggle template={template} />
      </Td>
      <Td isActionCell>
        <ActionsColumn
          items={[
            {
              title: 'Edit',
              onClick: () =>
                navigate(`/servingRuntimes/editServingRuntime/${template.metadata.name}`),
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
