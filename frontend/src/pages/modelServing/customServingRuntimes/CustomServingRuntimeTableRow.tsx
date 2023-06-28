import * as React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { useNavigate } from 'react-router-dom';
import { Label } from '@patternfly/react-core';
import { TemplateKind } from '~/k8sTypes';
import ResourceNameTooltip from '~/components/ResourceNameTooltip';
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
  const templateOOTB = isTemplateOOTB(template);

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
        {templateOOTB && <Label>Pre-installed</Label>}
      </Td>
      <Td dataLabel="Enabled">
        <CustomServingRuntimeEnabledToggle template={template} />
      </Td>
      <Td isActionCell>
        <ActionsColumn
          items={
            templateOOTB
              ? [
                  {
                    title: 'Duplicate',
                    onClick: () =>
                      navigate('/servingRuntimes/addServingRuntime', {
                        state: { template: template.objects[0] },
                      }),
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
