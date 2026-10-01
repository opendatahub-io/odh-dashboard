import * as React from 'react';
import { Label, Switch } from '@patternfly/react-core';
import { ActionsColumn, Tr, Td } from '@patternfly/react-table';
import { useNavigate } from 'react-router';
import {
  getDisplayNameFromK8sResource,
  getDescriptionFromK8sResource,
} from '@odh-dashboard/k8s-core';
import TableRowTitleDescription from '@odh-dashboard/internal/components/table/TableRowTitleDescription';
import { useLlmConfigAccess } from '../useLlmConfigAccess';
import {
  type LLMInferenceServiceConfigKind,
  TopologyTypeLabels,
  DASHBOARD_RESOURCE_LABEL,
  getConfigTopologyType,
} from '../../types';
import { isConfigPreInstalled, isConfigEnabled } from '../../utils';

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

  const { canPatch, canEdit, canDuplicate, canDelete } = useLlmConfigAccess(config);
  const actions = [
    ...(isDashboardCreated && canEdit
      ? [{ title: 'Edit', onClick: () => navigate(`edit/${configName}`) }]
      : []),
    ...(canDuplicate
      ? [{ title: 'Duplicate', onClick: () => navigate(`duplicate/${configName}`) }]
      : []),
    ...(isDashboardCreated && canDelete
      ? [{ title: 'Delete', onClick: () => onDelete(config), isDanger: true }]
      : []),
  ];

  return (
    <Tr data-testid={`topology-config-row-${configName}`}>
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
          id={`topology-config-toggle-${configName}`}
          aria-label={`${configName}-enabled-toggle`}
          data-testid="topology-config-enabled-toggle"
          isChecked={enabled}
          isDisabled={isToggling || !canPatch}
          onChange={() => onToggleEnabled(config)}
        />
      </Td>
      <Td dataLabel="Topology type">{topologyType ? TopologyTypeLabels[topologyType] : '-'}</Td>
      <Td isActionCell>{actions.length > 0 && <ActionsColumn items={actions} />}</Td>
    </Tr>
  );
};

export default TopologyConfigurationRow;
