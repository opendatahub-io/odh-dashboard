import * as React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { Label, LabelGroup } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { ResourceNameTooltip } from '@odh-dashboard/ui-core';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import { DeploymentResourceVersionLabels } from '@odh-dashboard/model-serving/shared/components';
import { PreInstalledName } from '@odh-dashboard/internal/concepts/k8s/utils';
import LlmAcceleratorConfigEnabledToggle from './LlmAcceleratorConfigEnabledToggle';
import type { LLMInferenceServiceConfigKind } from '../../types';
import { isConfigPreInstalled } from '../../utils';

type LlmAcceleratorConfigTableRowProps = {
  obj: LLMInferenceServiceConfigKind;
  rowIndex: number;
  onDeleteConfig: (config: LLMInferenceServiceConfigKind) => void;
};

const LlmAcceleratorConfigTableRow: React.FC<LlmAcceleratorConfigTableRowProps> = ({
  obj: config,
  rowIndex,
  onDeleteConfig,
}) => {
  const navigate = useNavigate();
  const configName = config.metadata.name;
  const preInstalled = isConfigPreInstalled(config);

  const kebabItems = preInstalled
    ? [
        {
          title: 'Duplicate',
          onClick: () => navigate(`duplicate/${configName}`),
        },
      ]
    : [
        {
          title: 'Edit',
          onClick: () => navigate(`edit/${configName}`),
        },
        {
          title: 'Duplicate',
          onClick: () => navigate(`duplicate/${configName}`),
        },
        {
          isSeparator: true,
        },
        {
          title: 'Delete',
          onClick: () => onDeleteConfig(config),
        },
      ];

  return (
    <Tr key={rowIndex} data-testid={`llm-accelerator-config ${configName}`}>
      <Td dataLabel="Name" width={70} className="pf-v6-u-text-break-word">
        <ResourceNameTooltip resource={config}>
          {getDisplayNameFromK8sResource(config)}
        </ResourceNameTooltip>
        <LabelGroup>
          {preInstalled && <Label data-testid="pre-installed-label">{PreInstalledName}</Label>}
          <DeploymentResourceVersionLabels resource={config} />
        </LabelGroup>
      </Td>
      <Td dataLabel="Enabled">
        <LlmAcceleratorConfigEnabledToggle config={config} />
      </Td>
      <Td isActionCell>
        <ActionsColumn items={kebabItems} />
      </Td>
    </Tr>
  );
};

export default LlmAcceleratorConfigTableRow;
