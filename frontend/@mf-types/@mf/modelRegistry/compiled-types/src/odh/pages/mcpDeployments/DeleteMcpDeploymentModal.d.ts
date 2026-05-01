import * as React from 'react';
import { McpDeployment } from '~/odh/types/mcpDeploymentTypes';
type DeleteMcpDeploymentModalProps = {
    deployment: McpDeployment;
    namespace: string;
    onClose: (deleted: boolean) => void;
};
declare const DeleteMcpDeploymentModal: React.FC<DeleteMcpDeploymentModalProps>;
export default DeleteMcpDeploymentModal;
