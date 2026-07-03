import * as React from 'react';
import {
  Button,
  Content,
  Label,
  Switch,
  Toolbar,
  ToolbarContent,
  ToolbarItem,
  Dropdown,
  DropdownList,
  DropdownItem,
  MenuToggle,
  EmptyState,
  EmptyStateBody,
} from '@patternfly/react-core';
import { ActionsColumn, Table, Thead, Tr, Th, Tbody, Td } from '@patternfly/react-table';
import { useNavigate } from 'react-router';
import {
  getDisplayNameFromK8sResource,
  getDescriptionFromK8sResource,
} from '@odh-dashboard/k8s-core';
import { k8sDeleteResource, K8sStatus } from '@openshift/dynamic-plugin-sdk-utils';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors/project';
import useNotification from '@odh-dashboard/internal/utilities/useNotification';
import {
  type LLMInferenceServiceConfigKind,
  LLMInferenceServiceConfigModel,
  TopologyType,
  TopologyTypeLabels,
  DASHBOARD_RESOURCE_LABEL,
  isConfigPreInstalled,
  isConfigEnabled,
  getConfigTopologyType,
} from '../types';
import { patchLLMInferenceServiceConfig } from '../api/LLMInferenceServiceConfigs';

type TopologyConfigurationsTableProps = {
  configs: LLMInferenceServiceConfigKind[];
};

const TopologyConfigurationsTable: React.FC<TopologyConfigurationsTableProps> = ({ configs }) => {
  const navigate = useNavigate();
  const { dashboardNamespace } = useDashboardNamespace();
  const notification = useNotification();
  const [isAddDropdownOpen, setIsAddDropdownOpen] = React.useState(false);
  const [togglingConfigs, setTogglingConfigs] = React.useState<Record<string, boolean>>({});

  const topologyTypes = Object.values(TopologyType);
  const primaryTopologyType = TopologyType.SINGLE_NODE;

  const handleToggleEnabled = async (config: LLMInferenceServiceConfigKind) => {
    const configName = config.metadata.name;
    setTogglingConfigs((prev) => ({ ...prev, [configName]: true }));

    const currentlyEnabled = isConfigEnabled(config);
    const updatedConfig: LLMInferenceServiceConfigKind = {
      ...config,
      metadata: {
        ...config.metadata,
        annotations: {
          ...config.metadata.annotations,
          'opendatahub.io/disabled': currentlyEnabled ? 'true' : 'false',
        },
      },
    };

    try {
      await patchLLMInferenceServiceConfig(config, updatedConfig);
    } catch (e) {
      notification.error(
        `Error ${currentlyEnabled ? 'disabling' : 'enabling'} configuration`,
        e instanceof Error ? e.message : 'Unknown error',
      );
    } finally {
      setTogglingConfigs((prev) => ({ ...prev, [configName]: false }));
    }
  };

  const handleDelete = async (config: LLMInferenceServiceConfigKind) => {
    try {
      await k8sDeleteResource<typeof LLMInferenceServiceConfigModel, K8sStatus>({
        model: LLMInferenceServiceConfigModel,
        queryOptions: {
          name: config.metadata.name,
          ns: dashboardNamespace,
        },
      });
    } catch (e) {
      notification.error(
        'Error deleting configuration',
        e instanceof Error ? e.message : 'Unknown error',
      );
    }
  };

  if (configs.length === 0) {
    return (
      <EmptyState data-testid="topology-configurations-empty-state">
        <EmptyStateBody>No topology configurations found.</EmptyStateBody>
      </EmptyState>
    );
  }

  return (
    <>
      <Toolbar>
        <ToolbarContent>
          <ToolbarItem>
            <Dropdown
              isOpen={isAddDropdownOpen}
              onOpenChange={setIsAddDropdownOpen}
              toggle={(toggleRef) => (
                <MenuToggle
                  ref={toggleRef}
                  variant="primary"
                  splitButtonItems={[
                    <Button
                      key="primary-add"
                      variant="primary"
                      data-testid="add-topology-config-button"
                      onClick={() => navigate(`add/${primaryTopologyType}`)}
                    >
                      Add single node configuration
                    </Button>,
                  ]}
                  aria-label="Add topology configuration"
                  onClick={() => setIsAddDropdownOpen(!isAddDropdownOpen)}
                  data-testid="add-topology-config-dropdown-toggle"
                />
              )}
            >
              <DropdownList>
                {topologyTypes.map((tt) => (
                  <DropdownItem
                    key={tt}
                    data-testid={`add-config-${tt}`}
                    onClick={() => {
                      setIsAddDropdownOpen(false);
                      navigate(`add/${tt}`);
                    }}
                  >
                    Add {TopologyTypeLabels[tt].toLowerCase()} configuration
                  </DropdownItem>
                ))}
              </DropdownList>
            </Dropdown>
          </ToolbarItem>
        </ToolbarContent>
      </Toolbar>
      <Table aria-label="Topology configurations table" data-testid="topology-configurations-table">
        <Thead>
          <Tr>
            <Th>Name</Th>
            <Th>Enabled</Th>
            <Th>Topology type</Th>
            <Th screenReaderText="Actions" />
          </Tr>
        </Thead>
        <Tbody>
          {configs.map((config) => {
            const configName = config.metadata.name;
            const displayName = getDisplayNameFromK8sResource(config);
            const description = getDescriptionFromK8sResource(config);
            const preInstalled = isConfigPreInstalled(config);
            const enabled = isConfigEnabled(config);
            const topologyType = getConfigTopologyType(config);
            const isDashboardCreated =
              config.metadata.labels?.[DASHBOARD_RESOURCE_LABEL] === 'true' && !preInstalled;

            return (
              <Tr key={configName} data-testid={`topology-config-row-${configName}`}>
                <Td dataLabel="Name">
                  <Content>
                    <Content component="p" style={{ marginBottom: 0 }}>
                      <strong>{displayName}</strong>
                    </Content>
                    {description && <Content component="small">{description}</Content>}
                  </Content>
                  {preInstalled && (
                    <Label data-testid="pre-installed-label" isCompact style={{ marginTop: 4 }}>
                      Pre-installed
                    </Label>
                  )}
                </Td>
                <Td dataLabel="Enabled">
                  <Switch
                    id={`topology-config-toggle-${configName}`}
                    aria-label={`${configName}-enabled-toggle`}
                    data-testid="topology-config-enabled-toggle"
                    isChecked={enabled}
                    isDisabled={!!togglingConfigs[configName]}
                    onChange={() => handleToggleEnabled(config)}
                  />
                </Td>
                <Td dataLabel="Topology type">
                  {topologyType ? TopologyTypeLabels[topologyType] : '-'}
                </Td>
                <Td isActionCell>
                  <ActionsColumn
                    items={
                      isDashboardCreated
                        ? [
                            {
                              title: 'Duplicate',
                              onClick: () => navigate(`duplicate/${configName}`),
                            },
                            {
                              title: 'Edit',
                              onClick: () => navigate(`edit/${configName}`),
                            },
                            { isSeparator: true } as const,
                            {
                              title: 'Delete',
                              onClick: () => handleDelete(config),
                              isDanger: true,
                            },
                          ]
                        : [
                            {
                              title: 'Duplicate',
                              onClick: () => navigate(`duplicate/${configName}`),
                            },
                          ]
                    }
                  />
                </Td>
              </Tr>
            );
          })}
        </Tbody>
      </Table>
    </>
  );
};

export default TopologyConfigurationsTable;
