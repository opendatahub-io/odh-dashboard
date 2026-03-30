import * as React from 'react';
import { useQueryParamNamespaces } from 'mod-arch-core';
import { McpDeployment } from '~/app/mcpDeploymentTypes';
import DeleteModal from '~/app/shared/components/DeleteModal';
import { deleteMcpDeployment } from '~/app/api/mcpDeploymentService';
import { BFF_HOST_PATH } from '~/app/utilities/const';
import { useNotification } from '~/app/hooks/useNotification';

type DeleteMcpDeploymentModalProps = {
  deployment: McpDeployment;
  onClose: (deleted: boolean) => void;
};

const DeleteMcpDeploymentModal: React.FC<DeleteMcpDeploymentModalProps> = ({
  deployment,
  onClose,
}) => {
  const notification = useNotification();
  const [isDeleting, setIsDeleting] = React.useState(false);
  const queryParams = useQueryParamNamespaces();

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await deleteMcpDeployment(BFF_HOST_PATH, queryParams)({}, deployment.name);
      onClose(true);
    } catch (e) {
      notification.error(
        `Error deleting ${deployment.name}`,
        e instanceof Error ? e.message : 'Failed to delete MCP deployment',
      );
      setIsDeleting(false);
    }
  };

  return (
    <DeleteModal
      title="Delete MCP server deployment?"
      testId="delete-mcp-deployment-modal"
      onClose={() => onClose(false)}
      deleting={isDeleting}
      onDelete={handleDelete}
      deleteName={deployment.name}
      submitButtonLabel="Delete MCP server deployment"
      inputPlaceholder={deployment.name}
      inputHelperText="Enter the deployment name exactly as shown to confirm deletion."
    >
      The <strong>{deployment.name}</strong> MCP server deployment and its API keys will be deleted,
      and its endpoint will no longer be available as an AI asset.
    </DeleteModal>
  );
};

export default DeleteMcpDeploymentModal;
