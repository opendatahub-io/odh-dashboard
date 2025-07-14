import * as React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { useNavigate } from 'react-router-dom';
import { Label, LabelGroup } from '@patternfly/react-core';
import { ServingRuntimeKind, TemplateKind } from '#~/k8sTypes';
import ResourceNameTooltip from '#~/components/ResourceNameTooltip';
import CustomServingRuntimePlatformsLabelGroup from '#~/pages/modelServing/customServingRuntimes/CustomServingRuntimePlatformsLabelGroup';
import { isOOTB, PreInstalledName } from '#~/concepts/k8s/utils';
import ServingRuntimeVersionLabel from '#~/pages/modelServing/screens/ServingRuntimeVersionLabel';
import CustomServingRuntimeEnabledToggle from './CustomServingRuntimeEnabledToggle';
import {
  getServingRuntimeDisplayNameFromTemplate,
  getServingRuntimeFromTemplate,
  getServingRuntimeNameFromTemplate,
  getServingRuntimeVersion,
} from './utils';
import CustomServingRuntimeAPIProtocolLabel from './CustomServingRuntimeAPIProtocolLabel';

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
  const templateOOTB = isOOTB(template);
  const sr: ServingRuntimeKind | undefined = getServingRuntimeFromTemplate(template);
  const srVersion: string | undefined = getServingRuntimeVersion(sr);
  return (
    <Tr
      key={rowIndex}
      id={servingRuntimeName}
      data-testid={`serving-runtime ${servingRuntimeName}`}
      draggable
      {...props}
    >
      <Td
        draggableRow={{
          id: `draggable-row-${servingRuntimeName}`,
        }}
      />
      <Td dataLabel="Name" width={70} className="pf-v6-u-text-break-word">
        <ResourceNameTooltip resource={template}>
          {getServingRuntimeDisplayNameFromTemplate(template)}
        </ResourceNameTooltip>
        <LabelGroup>
          {templateOOTB && <Label data-testid="pre-installed-label">{PreInstalledName}</Label>}
          {srVersion && <ServingRuntimeVersionLabel version={srVersion} />}
        </LabelGroup>
      </Td>
      <Td dataLabel="Enabled">
        <CustomServingRuntimeEnabledToggle template={template} />
      </Td>
      <Td dataLabel="Serving platforms supported">
        <CustomServingRuntimePlatformsLabelGroup template={template} />
      </Td>
      <Td dataLabel="API protocol">
        <CustomServingRuntimeAPIProtocolLabel template={template} />
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
                        state: { template },
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
                    title: 'Duplicate',
                    onClick: () =>
                      navigate('/servingRuntimes/addServingRuntime', {
                        state: { template },
                      }),
                  },
                  {
                    isSeparator: true,
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
