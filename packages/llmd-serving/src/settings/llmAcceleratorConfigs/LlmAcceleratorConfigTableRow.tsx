import * as React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { Label, LabelGroup } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { ResourceNameTooltip } from '@odh-dashboard/ui-core';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import { renderDeploymentResourceVersionLabels } from '@odh-dashboard/model-serving/shared/components';
import { PreInstalledName } from '@odh-dashboard/internal/concepts/k8s/utils';
import LlmAcceleratorConfigEnabledToggle from './LlmAcceleratorConfigEnabledToggle';
import type { LLMInferenceServiceConfigKind } from '../../types';
import { isConfigPreInstalled } from '../../utils';
import { useLlmConfigAccess } from '../useLlmConfigAccess';

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
  const { canEdit, canDuplicate, canDelete } = useLlmConfigAccess(config, 'update');

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
          isDanger: true,
        },
      ];
  const allowedItems = kebabItems.filter((item) => {
    switch (item.title) {
      case 'Edit':
        return canEdit;
      case 'Duplicate':
        return canDuplicate;
      case 'Delete':
        return canDelete;
      default:
        return false;
    }
  });

  return (
    <Tr key={rowIndex} data-testid={`llm-accelerator-config ${configName}`}>
      <Td dataLabel="Name" width={70} className="pf-v6-u-text-break-word">
        <ResourceNameTooltip resource={config}>
          {getDisplayNameFromK8sResource(config)}
        </ResourceNameTooltip>
        <LabelGroup numLabels={5}>
          {preInstalled && <Label data-testid="pre-installed-label">{PreInstalledName}</Label>}
          {renderDeploymentResourceVersionLabels(config)}
        </LabelGroup>
      </Td>
      <Td dataLabel="Enabled">
        <LlmAcceleratorConfigEnabledToggle config={config} />
      </Td>
      <Td isActionCell>{allowedItems.length > 0 && <ActionsColumn items={allowedItems} />}</Td>
    </Tr>
  );
};

export default LlmAcceleratorConfigTableRow;
