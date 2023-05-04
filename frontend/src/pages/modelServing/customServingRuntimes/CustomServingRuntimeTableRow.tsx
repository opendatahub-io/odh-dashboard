import * as React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { useNavigate } from 'react-router-dom';
import { TemplateKind } from '~/k8sTypes';
import ResourceNameTooltip from '~/pages/projects/components/ResourceNameTooltip';
import CustomServingRuntimeEnabledToggle from './CustomServingRuntimeEnabledToggle';
import {
  getServingRuntimeDisplayNameFromTemplate,
  getServingRuntimeNameFromTemplate,
  isTemplateOOTB,
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
      <Td dataLabel="Name">
        <ResourceNameTooltip resource={template.objects[0]}>
          {getServingRuntimeDisplayNameFromTemplate(template)}
        </ResourceNameTooltip>
      </Td>
      <Td dataLabel="Enabled">
        <CustomServingRuntimeEnabledToggle template={template} />
      </Td>
      <Td isActionCell>
        <ActionsColumn
          items={
            isTemplateOOTB(template)
              ? [
                  {
                    title: 'Clone',
                    onClick: () =>
                      navigate('/servingRuntimes/addServingRuntime', { state: { template } }),
                  },
                ]
              : [
                  {
                    title: 'Edit',
                    onClick: () =>
                      navigate(`/servingRuntimes/editServingRuntime/${servingRuntimeName}`),
                  },
                  {
                    title: 'Delete',
                    onClick: () => onDeleteTemplate(template),
                  },
                ]
          }
        />
      </Td>
    </Tr>
  );
};

export default CustomServingRuntimeTableRow;
