import * as React from 'react';
import { ActionsColumn, Td, Tr } from '@patternfly/react-table';
import { Button, Label, Switch } from '@patternfly/react-core';
import { useNavigate } from 'react-router-dom';
import { McpCatalogSourceConfig } from '~/app/mcpServerCatalogTypes';
import { mcpManageSourceUrl } from '~/app/routes/mcpCatalogSettings/mcpCatalogSettings';
import { ModelVisibilityBadgeColor } from '~/concepts/modelCatalogSettings/const';
import DeleteModal from '~/app/shared/components/DeleteModal';
import { useNotification } from '~/app/hooks/useNotification';
import McpCatalogSourceStatus from '~/app/pages/mcpCatalogSettings/components/McpCatalogSourceStatus';
import { MCP_SOURCE_TYPE_LABELS } from '~/app/pages/mcpCatalogSettings/const';

type McpCatalogSourceConfigsTableRowProps = {
  mcpCatalogSourceConfig: McpCatalogSourceConfig;
  onDeleteSource: (sourceId: string) => Promise<void>;
  isUpdatingToggle: boolean;
  onToggleUpdate: (checked: boolean, sourceConfig: McpCatalogSourceConfig) => void;
};

const McpCatalogSourceConfigsTableRow: React.FC<McpCatalogSourceConfigsTableRowProps> = ({
  mcpCatalogSourceConfig,
  onDeleteSource,
  isUpdatingToggle,
  onToggleUpdate,
}) => {
  const navigate = useNavigate();
  const notification = useNotification();
  const [isDeleteModalOpen, setIsDeleteModalOpen] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<Error | undefined>();

  const isDefault = mcpCatalogSourceConfig.isDefault ?? false;
  const isEnabled = mcpCatalogSourceConfig.enabled ?? true;

  const hasFilters = React.useMemo(
    () =>
      (mcpCatalogSourceConfig.includedServers?.length ?? 0) > 0 ||
      (mcpCatalogSourceConfig.excludedServers?.length ?? 0) > 0,
    [mcpCatalogSourceConfig],
  );

  const handleEnableToggle = (checked: boolean) => {
    onToggleUpdate(checked, mcpCatalogSourceConfig);
  };

  const handleManageSource = () => {
    navigate(mcpManageSourceUrl(mcpCatalogSourceConfig.id));
  };

  const handleDeleteClick = () => {
    setDeleteError(undefined);
    setIsDeleteModalOpen(true);
  };

  const handleDeleteConfirm = async () => {
    setIsDeleting(true);
    setDeleteError(undefined);

    try {
      await onDeleteSource(mcpCatalogSourceConfig.id);
      setIsDeleteModalOpen(false);
      notification.success(`${mcpCatalogSourceConfig.name} deleted successfully`);
    } catch (error) {
      setDeleteError(error instanceof Error ? error : new Error('Failed to delete source'));
    } finally {
      setIsDeleting(false);
    }
  };

  const handleCloseDeleteModal = () => {
    if (!isDeleting) {
      setIsDeleteModalOpen(false);
    }
  };

  return (
    <>
      <Tr>
        <Td dataLabel="Name" style={{ verticalAlign: 'middle' }}>
          <span data-testid={`mcp-source-name-${mcpCatalogSourceConfig.id}`}>
            {mcpCatalogSourceConfig.name}
          </span>
        </Td>
        <Td dataLabel="Server visibility" style={{ verticalAlign: 'middle' }}>
          {hasFilters ? (
            <Label
              color={ModelVisibilityBadgeColor.FILTERED}
              data-testid={`mcp-server-visibility-filtered-${mcpCatalogSourceConfig.id}`}
            >
              Filtered
            </Label>
          ) : (
            <Label
              color={ModelVisibilityBadgeColor.UNFILTERED}
              data-testid={`mcp-server-visibility-unfiltered-${mcpCatalogSourceConfig.id}`}
              variant="outline"
            >
              All servers
            </Label>
          )}
        </Td>
        <Td dataLabel="Source type" style={{ verticalAlign: 'middle' }}>
          <span data-testid={`mcp-source-type-${mcpCatalogSourceConfig.id}`}>
            {MCP_SOURCE_TYPE_LABELS[mcpCatalogSourceConfig.type] ?? mcpCatalogSourceConfig.type}
          </span>
        </Td>
        <Td dataLabel="Enable" style={{ verticalAlign: 'middle' }}>
          <Switch
            data-testid={`mcp-enable-toggle-${mcpCatalogSourceConfig.id}`}
            id={`mcp-enable-toggle-${mcpCatalogSourceConfig.id}`}
            aria-label={`Enable ${mcpCatalogSourceConfig.name}`}
            isChecked={isEnabled}
            isDisabled={isUpdatingToggle}
            onChange={(_event, checked) => handleEnableToggle(checked)}
          />
        </Td>
        <Td dataLabel="Validation status" style={{ verticalAlign: 'middle' }}>
          <McpCatalogSourceStatus mcpCatalogSourceConfig={mcpCatalogSourceConfig} />
        </Td>
        <Td style={{ verticalAlign: 'middle' }}>
          <Button
            variant="link"
            onClick={handleManageSource}
            data-testid={`mcp-manage-source-button-${mcpCatalogSourceConfig.id}`}
          >
            Manage source
          </Button>
        </Td>
        <Td isActionCell style={{ verticalAlign: 'middle' }}>
          {!isDefault && (
            <ActionsColumn
              items={[{ title: 'Delete source', onClick: handleDeleteClick }]}
              data-testid={`mcp-source-actions-${mcpCatalogSourceConfig.id}`}
            />
          )}
        </Td>
      </Tr>
      {isDeleteModalOpen && (
        <DeleteModal
          title="Delete a source"
          testId="mcp-delete-source-modal"
          onClose={handleCloseDeleteModal}
          deleting={isDeleting}
          onDelete={handleDeleteConfirm}
          deleteName={mcpCatalogSourceConfig.name}
          error={deleteError}
        >
          The <strong>{mcpCatalogSourceConfig.name}</strong> source will be deleted, and its MCP
          servers will be removed from the MCP catalog.
        </DeleteModal>
      )}
    </>
  );
};

export default McpCatalogSourceConfigsTableRow;
