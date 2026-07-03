import * as React from 'react';
import { Content, Label, Stack, StackItem, Switch } from '@patternfly/react-core';
import { ActionsColumn, Tr, Td } from '@patternfly/react-table';
import { useNavigate } from 'react-router';
import {
  getDisplayNameFromK8sResource,
  getDescriptionFromK8sResource,
} from '@odh-dashboard/k8s-core';
import {
  type LLMInferenceServiceConfigKind,
  TopologyType,
  TopologyTypeLabels,
  DASHBOARD_RESOURCE_LABEL,
  isConfigPreInstalled,
  isConfigEnabled,
  getConfigTopologyType,
} from '../types';

type TopologyConfigurationRowProps = {
  config: LLMInferenceServiceConfigKind;
  onToggleEnabled: (config: LLMInferenceServiceConfigKind) => void;
  onDelete: (config: LLMInferenceServiceConfigKind) => void;
  isToggling: boolean;
};

const TopologyConfigurationRow: React.FC<TopologyConfigurationRowProps> = ({
  config,
  onToggleEnabled,
  onDelete,
  isToggling,
}) => {
  const navigate = useNavigate();
  const configName = config.metadata.name;
  const displayName = getDisplayNameFromK8sResource(config);
  const description = getDescriptionFromK8sResource(config);
  const preInstalled = isConfigPreInstalled(config);
  const enabled = isConfigEnabled(config);
  const topologyType = getConfigTopologyType(config);
  const isDashboardCreated =
    config.metadata.labels?.[DASHBOARD_RESOURCE_LABEL] === 'true' && !preInstalled;
  const duplicatePath = `add/${topologyType ?? TopologyType.SINGLE_NODE}`;

  return (
    <Tr data-testid={`topology-config-row-${configName}`}>
      <Td dataLabel="Name">
        <Stack>
          <StackItem>
            <Content>
              <Content component="p" className="pf-v6-u-mb-0">
                <strong>{displayName}</strong>
              </Content>
              {description && <Content component="small">{description}</Content>}
            </Content>
          </StackItem>
          {preInstalled && (
            <StackItem>
              <Label data-testid="pre-installed-label" isCompact>
                Pre-installed
              </Label>
            </StackItem>
          )}
        </Stack>
      </Td>
      <Td dataLabel="Enabled">
        <Switch
          id={`topology-config-toggle-${configName}`}
          aria-label={`${configName}-enabled-toggle`}
          data-testid="topology-config-enabled-toggle"
          isChecked={enabled}
          isDisabled={isToggling}
          onChange={() => onToggleEnabled(config)}
        />
      </Td>
      <Td dataLabel="Topology type">{topologyType ? TopologyTypeLabels[topologyType] : '-'}</Td>
      <Td isActionCell>
        <ActionsColumn
          items={
            isDashboardCreated
              ? [
                  {
                    title: 'Duplicate',
                    onClick: () => navigate(duplicatePath, { state: { sourceConfig: config } }),
                  },
                  {
                    title: 'Edit',
                    onClick: () => navigate(`edit/${configName}`),
                  },
                  { isSeparator: true },
                  {
                    title: 'Delete',
                    onClick: () => onDelete(config),
                    isDanger: true,
                  },
                ]
              : [
                  {
                    title: 'Duplicate',
                    onClick: () => navigate(duplicatePath, { state: { sourceConfig: config } }),
                  },
                ]
          }
        />
      </Td>
    </Tr>
  );
};

export default TopologyConfigurationRow;
