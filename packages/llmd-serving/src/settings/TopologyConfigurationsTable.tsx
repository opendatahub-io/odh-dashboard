import * as React from 'react';
import {
  Button,
  Dropdown,
  DropdownList,
  DropdownItem,
  MenuToggle,
  EmptyState,
  EmptyStateBody,
  ToolbarItem,
} from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import ContentModal from '@odh-dashboard/ui-core/components/ContentModal';
import { Table, SortableData } from '@odh-dashboard/ui-core';
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
} from '../types';
import { isConfigEnabled } from '../utils';
import { patchLLMInferenceServiceConfig } from '../api/LLMInferenceServiceConfigs';

const columns: SortableData<LLMInferenceServiceConfigKind>[] = [
  { label: 'Name', field: 'name', sortable: false },
  { label: 'Enabled', field: 'enabled', sortable: false },
  { label: 'Topology type', field: 'topologyType', sortable: false },
  { label: '', field: 'kebab', sortable: false },
];

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
  const dropdownTopologyTypes = topologyTypes.filter((t) => t !== primaryTopologyType);

  const handleToggleEnabled = async (config: LLMInferenceServiceConfigKind) => {
    const configName = config.metadata.name;
    setTogglingConfigs((prev) => ({ ...prev, [configName]: true }));

    const currentlyEnabled = isConfigEnabled(config);
    const annotations = { ...config.metadata.annotations };
    if (currentlyEnabled) {
      annotations['opendatahub.io/disabled'] = 'true';
    } else {
      delete annotations['opendatahub.io/disabled'];
    }
    const updatedConfig: LLMInferenceServiceConfigKind = {
      ...config,
      metadata: {
        ...config.metadata,
        annotations,
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
    await k8sDeleteResource<typeof LLMInferenceServiceConfigModel, K8sStatus>({
      model: LLMInferenceServiceConfigModel,
      queryOptions: {
        name: deleteConfig.metadata.name,
        ns: dashboardNamespace,
      },
    })
      .then(() => {
        setDeleteConfig(undefined);
      })
      .catch((e: unknown) => {
        notification.error(
          'Error deleting configuration',
          e instanceof Error ? e.message : 'Unknown error',
        );
      })
      .finally(() => {
        setIsDeleting(false);
      });
  };

  const toolbarContent = (
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
                Add {TopologyTypeLabels[primaryTopologyType]} configuration
              </Button>,
            ]}
            aria-label="Add topology configuration"
            onClick={() => setIsAddDropdownOpen(!isAddDropdownOpen)}
            data-testid="add-topology-config-dropdown-toggle"
          />
        )}
      >
        <DropdownList>
          {dropdownTopologyTypes.map((tt) => (
            <DropdownItem
              key={tt}
              data-testid={`add-config-${tt}`}
              onClick={() => {
                setIsAddDropdownOpen(false);
                navigate(`add/${tt}`);
              }}
            >
              Add {TopologyTypeLabels[tt]} configuration
            </DropdownItem>
          ))}
        </DropdownList>
      </Dropdown>
    </ToolbarItem>
  );

  return (
    <>
      <Table
        aria-label="Topology configurations table"
        data-testid="topology-configurations-table"
        data={configs}
        columns={columns}
        toolbarContent={toolbarContent}
        emptyTableView={
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
        }
        rowRenderer={(config) => (
          <TopologyConfigurationRow
            key={config.metadata.name}
            config={config}
            onToggleEnabled={handleToggleEnabled}
            onDelete={setDeleteConfig}
            isToggling={!!togglingConfigs[config.metadata.name]}
          />
        )}
      />
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
