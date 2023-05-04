import * as React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { useNavigate } from 'react-router-dom';
import { TemplateKind } from '~/k8sTypes';
import CustomServingRuntimeEnabledToggle from './CustomServingRuntimeEnabledToggle';
import {
  getServingRuntimeDisplayNameFromTemplate,
  getServingRuntimeNameFromTemplate,
} from './utils';

type CustomServingRuntimeTableRowProps = {
  obj: TemplateKind;
  rowIndex: number;
  onDeleteTemplate: (obj: TemplateKind) => void;
};

const CustomServingRuntimeTableRow: React.FC<CustomServingRuntimeTableRowProps> = ({
  obj: template,
  rowIndex,
  onDeleteTemplate,
  ...props
}) => {
  const navigate = useNavigate();
  const servingRuntimeName = getServingRuntimeNameFromTemplate(template);

  return (
    <Tr key={rowIndex} id={servingRuntimeName} draggable {...props}>
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
