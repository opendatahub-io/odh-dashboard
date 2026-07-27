import * as React from 'react';
import { Label, Switch } from '@patternfly/react-core';
import { ActionsColumn, Tr, Td } from '@patternfly/react-table';
import { useNavigate } from 'react-router';
import {
  getDisplayNameFromK8sResource,
  getDescriptionFromK8sResource,
} from '@odh-dashboard/k8s-core';
import TableRowTitleDescription from '@odh-dashboard/internal/components/table/TableRowTitleDescription';
import {
  type LLMInferenceServiceConfigKind,
  TopologyTypeLabels,
  DASHBOARD_RESOURCE_LABEL,
  getConfigSupportedTopologies,
} from '../types';
import { isConfigPreInstalled, isConfigEnabled } from '../utils';

export const getSupportedTopologiesLabel = (config: LLMInferenceServiceConfigKind): string => {
  const topologies = getConfigSupportedTopologies(config);
  return topologies.length > 0 ? topologies.map((t) => TopologyTypeLabels[t]).join(', ') : 'All';
};

type RoutingConfigurationRowProps = {
  config: LLMInferenceServiceConfigKind;
  onToggleEnabled: (config: LLMInferenceServiceConfigKind) => void;
  onDelete: (config: LLMInferenceServiceConfigKind) => void;
  isToggling: boolean;
};

const RoutingConfigurationRow: React.FC<RoutingConfigurationRowProps> = ({
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
  const isDashboardCreated =
    config.metadata.labels?.[DASHBOARD_RESOURCE_LABEL] === 'true' && !preInstalled;

  return (
    <Tr data-testid={`routing-config-row-${configName}`}>
      <Td dataLabel="Name">
        <TableRowTitleDescription
          title={displayName}
          resource={config}
          description={description}
          label={
            preInstalled ? (
              <div>
                <Label data-testid="pre-installed-label" isCompact>
                  Pre-installed
                </Label>
              </div>
            ) : undefined
          }
        />
      </Td>
      <Td dataLabel="Enabled">
        <Switch
          id={`routing-config-toggle-${configName}`}
          aria-label={`${configName}-enabled-toggle`}
          data-testid="routing-config-enabled-toggle"
          isChecked={enabled}
          isDisabled={isToggling}
          onChange={() => onToggleEnabled(config)}
        />
      </Td>
      <Td dataLabel="Topology type">{getSupportedTopologiesLabel(config)}</Td>
      <Td isActionCell>
        <ActionsColumn
          items={
            isDashboardCreated
              ? [
                  {
                    title: 'Edit',
                    onClick: () => navigate(`edit/${configName}`),
                  },
                  {
                    title: 'Duplicate',
                    onClick: () => navigate('add', { state: { sourceConfig: config } }),
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
                    onClick: () => navigate('add', { state: { sourceConfig: config } }),
                  },
                ]
          }
        />
      </Td>
    </Tr>
  );
};

export default RoutingConfigurationRow;
