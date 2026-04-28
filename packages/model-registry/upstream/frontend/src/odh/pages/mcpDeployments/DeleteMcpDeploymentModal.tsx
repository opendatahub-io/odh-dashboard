import * as React from 'react';
import { McpDeployment } from '~/odh/types/mcpDeploymentTypes';
import DeleteModal from '~/app/shared/components/DeleteModal';
import { deleteMcpDeployment } from '~/odh/api/mcpDeploymentService';
import { BFF_HOST_PATH } from '~/app/utilities/const';
import { getDeploymentDisplayName } from './utils';

type DeleteMcpDeploymentModalProps = {
  deployment: McpDeployment;
  namespace: string;
  onClose: (deleted: boolean) => void;
};

const DeleteMcpDeploymentModal: React.FC<DeleteMcpDeploymentModalProps> = ({
  deployment,
  namespace,
  onClose,
}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<Error | undefined>();
  const queryParams = React.useMemo(() => ({ namespace }), [namespace]);

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(undefined);
    try {
      await deleteMcpDeployment(BFF_HOST_PATH, queryParams)({}, deployment.name);
      onClose(true);
    } catch (e) {
      setDeleteError(e instanceof Error ? e : new Error('Failed to delete MCP deployment'));
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
      submitButtonLabel="Delete"
      confirmationRequiredIndicator
      error={deleteError}
    >
      The <strong>{getDeploymentDisplayName(deployment)}</strong> MCP server deployment and its API
      keys will be deleted, and its endpoint will no longer be available as an AI asset.
    </DeleteModal>
  );
};

export default DeleteMcpDeploymentModal;
