import * as React from 'react';
import { Alert, Stack, StackItem } from '@patternfly/react-core';
import DeleteModal from '~/app/shared/components/DeleteModal';
import { deleteMcpGatewayLayer } from '~/odh/api/mcpDeploymentService';

type DeleteMcpGatewayLayerModalProps = {
  namespace: string;
  onClose: (deleted: boolean) => void;
};

const DeleteMcpGatewayLayerModal: React.FC<DeleteMcpGatewayLayerModalProps> = ({
  namespace,
  onClose,
}) => {
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [deleteError, setDeleteError] = React.useState<Error>();

  const handleDelete = async () => {
    setIsDeleting(true);
    setDeleteError(undefined);
    try {
      await deleteMcpGatewayLayer('', { namespace })({});
      onClose(true);
    } catch (error) {
      setDeleteError(
        error instanceof Error ? error : new Error('Failed to remove the Gateway layer'),
      );
      setIsDeleting(false);
    }
  };

  return (
    <DeleteModal
      title="Remove Gateway layer?"
      testId="delete-mcp-gateway-layer-modal"
      onClose={() => onClose(false)}
      deleting={isDeleting}
      onDelete={handleDelete}
      deleteName="GATEWAY"
      submitButtonLabel="Remove layer"
      confirmationRequiredIndicator
      error={deleteError}
    >
      <Stack hasGutter>
        <StackItem>
          This removes Project Matrix Gateway-layer resources created in{' '}
          <strong>{namespace}</strong>: MCP server deployments, gateway registrations, HTTPRoutes,
          ReferenceGrants, and installer-created prerequisites.
        </StackItem>
        <StackItem>
          <Alert isInline variant="warning" title="Shared platform services are preserved">
            RHCL, Gateway API, MCP Lifecycle, MCP Gateway, operators, cluster ingress, and other
            shared OpenShift AI services are not removed.
          </Alert>
        </StackItem>
        {isDeleting && (
          <StackItem>
            <Alert
              isInline
              variant="info"
              title="Waiting for Gateway layer cleanup"
              data-testid="delete-layer-cleanup-progress-alert"
            >
              The removal request was accepted. The installer is verifying that all Project Matrix
              Gateway-layer resources are gone. Shared platform services remain untouched.
            </Alert>
          </StackItem>
        )}
        <StackItem>Type GATEWAY to confirm.</StackItem>
      </Stack>
    </DeleteModal>
  );
};

export default DeleteMcpGatewayLayerModal;
