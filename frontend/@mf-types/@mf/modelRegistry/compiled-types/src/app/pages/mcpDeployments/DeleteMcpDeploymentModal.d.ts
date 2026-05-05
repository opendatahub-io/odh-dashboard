import * as React from 'react';
import { McpDeployment } from '~/app/mcpDeploymentTypes';
type DeleteMcpDeploymentModalProps = {
    deployment: McpDeployment;
    onClose: (deleted: boolean) => void;
};
declare const DeleteMcpDeploymentModal: React.FC<DeleteMcpDeploymentModalProps>;
export default DeleteMcpDeploymentModal;
