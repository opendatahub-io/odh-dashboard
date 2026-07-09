import * as React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { Label, LabelGroup } from '@patternfly/react-core';
import { ResourceNameTooltip } from '@odh-dashboard/ui-core';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import { isUnsupportedResource } from '@odh-dashboard/model-serving/concepts/unsupportedResources';
import { PreInstalledName } from '@odh-dashboard/internal/concepts/k8s/utils';
import LlmAcceleratorConfigEnabledToggle from './LlmAcceleratorConfigEnabledToggle';
import type { LLMInferenceServiceConfigKind } from '../types';
import { isConfigPreInstalled } from '../utils';

type LlmAcceleratorConfigTableRowProps = {
  obj: LLMInferenceServiceConfigKind;
  rowIndex: number;
};

const LlmAcceleratorConfigTableRow: React.FC<LlmAcceleratorConfigTableRowProps> = ({
  obj: config,
  rowIndex,
}) => {
  const configName = config.metadata.name;
  const preInstalled = isConfigPreInstalled(config);
  const unsupported = isUnsupportedResource(config);

  return (
    <Tr key={rowIndex} data-testid={`llm-accelerator-config ${configName}`}>
      <Td dataLabel="Name" width={70} className="pf-v6-u-text-break-word">
        <ResourceNameTooltip resource={config}>
          {getDisplayNameFromK8sResource(config)}
        </ResourceNameTooltip>
        <LabelGroup>
          {preInstalled && <Label data-testid="pre-installed-label">{PreInstalledName}</Label>}
          {unsupported && <Label data-testid="unsupported-label">Limited support</Label>}
        </LabelGroup>
      </Td>
      <Td dataLabel="Enabled">
        <LlmAcceleratorConfigEnabledToggle config={config} />
      </Td>
      <Td isActionCell>
        <ActionsColumn
          items={[
            {
              title: 'Duplicate',
              // TODO: Wire up duplicate form in a follow-up PR
              onClick: () => undefined,
            },
          ]}
        />
      </Td>
    </Tr>
  );
};

export default LlmAcceleratorConfigTableRow;
