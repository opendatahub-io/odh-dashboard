import * as React from 'react';
import {
  Button,
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
import { CubesIcon } from '@patternfly/react-icons';
import ContentModal from '@odh-dashboard/internal/components/modals/ContentModal';
import { Table, Thead, Tr, Th, Tbody } from '@patternfly/react-table';
import { useNavigate } from 'react-router';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import { k8sDeleteResource, K8sStatus } from '@openshift/dynamic-plugin-sdk-utils';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors/project';
import useNotification from '@odh-dashboard/internal/utilities/useNotification';
import TopologyConfigurationRow from './TopologyConfigurationRow';
import {
  type LLMInferenceServiceConfigKind,
  LLMInferenceServiceConfigModel,
  TopologyType,
  TopologyTypeLabels,
  isConfigEnabled,
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
  const [deleteConfig, setDeleteConfig] = React.useState<LLMInferenceServiceConfigKind>();
  const [isDeleting, setIsDeleting] = React.useState(false);

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

  const handleDelete = async () => {
    if (!deleteConfig) {
      return;
    }
    setIsDeleting(true);
    try {
      await k8sDeleteResource<typeof LLMInferenceServiceConfigModel, K8sStatus>({
        model: LLMInferenceServiceConfigModel,
        queryOptions: {
          name: deleteConfig.metadata.name,
          ns: dashboardNamespace,
        },
      });
      setDeleteConfig(undefined);
    } catch (e) {
      notification.error(
        'Error deleting configuration',
        e instanceof Error ? e.message : 'Unknown error',
      );
    } finally {
      setIsDeleting(false);
    }
  };

  if (configs.length === 0) {
    return (
      <EmptyState
        headingLevel="h2"
        titleText="No topology configurations found"
        icon={CubesIcon}
        data-testid="topology-configurations-empty-state"
      >
        <EmptyStateBody>
          To get started, add a topology configuration using the button above.
        </EmptyStateBody>
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
          {configs.map((config) => (
            <TopologyConfigurationRow
              key={config.metadata.name}
              config={config}
              onToggleEnabled={handleToggleEnabled}
              onDelete={setDeleteConfig}
              isToggling={!!togglingConfigs[config.metadata.name]}
            />
          ))}
        </Tbody>
      </Table>
      {deleteConfig && (
        <ContentModal
          title="Delete llm-d topology configuration?"
          onClose={() => setDeleteConfig(undefined)}
          variant="small"
          dataTestId="delete-topology-config-modal"
          contents={
            <>
              Delete <strong>{getDisplayNameFromK8sResource(deleteConfig)}</strong>? This cannot be
              undone. Out-of-the-box configurations cannot be deleted from the cluster from this UI
              (disable them instead).
            </>
          }
          buttonActions={[
            {
              label: 'Delete',
              variant: 'danger',
              onClick: handleDelete,
              isLoading: isDeleting,
              isDisabled: isDeleting,
              dataTestId: 'delete-topology-config-confirm',
            },
            {
              label: 'Cancel',
              variant: 'link',
              onClick: () => setDeleteConfig(undefined),
              isDisabled: isDeleting,
            },
          ]}
        />
      )}
    </>
  );
};

export default TopologyConfigurationsTable;
