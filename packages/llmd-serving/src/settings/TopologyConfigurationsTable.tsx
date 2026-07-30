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
// eslint-disable-next-line @odh-dashboard/no-restricted-imports -- standard delete confirmation wrapper
import DeleteModal from '@odh-dashboard/internal/pages/projects/components/DeleteModal';
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
  getConfigTopologyType,
} from '../types';
import { isConfigEnabled, isConfigEffectivelyEnabled } from '../utils';
import { patchLLMInferenceServiceConfig } from '../api/LLMInferenceServiceConfigs';

const getTopologyTypeLabel = (config: LLMInferenceServiceConfigKind): string => {
  const type = getConfigTopologyType(config);
  return type ? TopologyTypeLabels[type] : '';
};

export const columns: SortableData<LLMInferenceServiceConfigKind>[] = [
  {
    label: 'Name',
    field: 'name',
    sortable: (a, b) =>
      getDisplayNameFromK8sResource(a).localeCompare(getDisplayNameFromK8sResource(b)),
  },
  {
    label: 'Enabled',
    field: 'enabled',
    sortable: (a, b) =>
      Number(isConfigEffectivelyEnabled(b)) - Number(isConfigEffectivelyEnabled(a)),
    info: {
      popover: 'When enabled, this configuration is available in the deployment wizard.',
      popoverProps: { showClose: true },
    },
  },
  {
    label: 'Topology type',
    field: 'topologyType',
    sortable: (a, b) => getTopologyTypeLabel(a).localeCompare(getTopologyTypeLabel(b)),
  },
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

  const handleDelete = () => {
    if (!deleteConfig) {
      return;
    }
    setIsDeleting(true);
    k8sDeleteResource<typeof LLMInferenceServiceConfigModel, K8sStatus>({
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
        <DeleteModal
          title="Delete llm-d topology configuration?"
          onClose={() => {
            setDeleteConfig(undefined);
            setIsDeleting(false);
          }}
          submitButtonLabel="Delete topology configuration"
          onDelete={handleDelete}
          deleting={isDeleting}
          deleteName={getDisplayNameFromK8sResource(deleteConfig)}
        >
          This action cannot be undone.
        </DeleteModal>
      )}
    </>
  );
};

export default TopologyConfigurationsTable;
