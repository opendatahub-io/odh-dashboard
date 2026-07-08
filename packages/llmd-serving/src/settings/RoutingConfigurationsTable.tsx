import * as React from 'react';
import { Button, EmptyState, EmptyStateBody, ToolbarItem } from '@patternfly/react-core';
import { CubesIcon } from '@patternfly/react-icons';
import ContentModal from '@odh-dashboard/internal/components/modals/ContentModal';
import { Table, SortableData } from '@odh-dashboard/ui-core';
import { useNavigate } from 'react-router';
import { getDisplayNameFromK8sResource } from '@odh-dashboard/k8s-core';
import { k8sDeleteResource, K8sStatus } from '@openshift/dynamic-plugin-sdk-utils';
import { useDashboardNamespace } from '@odh-dashboard/internal/redux/selectors/project';
import useNotification from '@odh-dashboard/internal/utilities/useNotification';
import RoutingConfigurationRow from './RoutingConfigurationRow';
import { type LLMInferenceServiceConfigKind, LLMInferenceServiceConfigModel } from '../types';
import { isConfigEnabled } from '../utils';
import { patchLLMInferenceServiceConfig } from '../api/LLMInferenceServiceConfigs';

const columns: SortableData<LLMInferenceServiceConfigKind>[] = [
  { label: 'Name', field: 'name', sortable: false },
  { label: 'Enabled', field: 'enabled', sortable: false },
  { label: 'Routing type', field: 'routingType', sortable: false },
  { label: '', field: 'kebab', sortable: false },
];

type RoutingConfigurationsTableProps = {
  configs: LLMInferenceServiceConfigKind[];
};

const RoutingConfigurationsTable: React.FC<RoutingConfigurationsTableProps> = ({ configs }) => {
  const navigate = useNavigate();
  const { dashboardNamespace } = useDashboardNamespace();
  const notification = useNotification();
  const [togglingConfigs, setTogglingConfigs] = React.useState<Record<string, boolean>>({});
  const [deleteConfig, setDeleteConfig] = React.useState<LLMInferenceServiceConfigKind>();
  const [isDeleting, setIsDeleting] = React.useState(false);

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

  const toolbarContent = (
    <ToolbarItem>
      <Button
        variant="primary"
        data-testid="add-routing-config-button"
        onClick={() => navigate('add')}
      >
        Add llm-d routing configuration
      </Button>
    </ToolbarItem>
  );

  return (
    <>
      <Table
        aria-label="Routing configurations table"
        data-testid="routing-configurations-table"
        data={configs}
        columns={columns}
        toolbarContent={toolbarContent}
        emptyTableView={
          <EmptyState
            headingLevel="h2"
            titleText="No routing configurations found"
            icon={CubesIcon}
            data-testid="routing-configurations-empty-state"
          >
            <EmptyStateBody>
              To get started, add a routing configuration using the button above.
            </EmptyStateBody>
          </EmptyState>
        }
        rowRenderer={(config) => (
          <RoutingConfigurationRow
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
          title="Delete llm-d routing configuration?"
          onClose={() => setDeleteConfig(undefined)}
          variant="small"
          dataTestId="delete-routing-config-modal"
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
              dataTestId: 'delete-routing-config-confirm',
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

export default RoutingConfigurationsTable;
