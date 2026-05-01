import React from 'react';
import { McpDeployment } from '~/odh/types/mcpDeploymentTypes';
type McpDeployModalProps = {
    isOpen?: boolean;
    onClose: (saved?: boolean) => void;
    existingDeployment?: McpDeployment;
};
declare const McpDeployModal: React.FC<McpDeployModalProps>;
export default McpDeployModal;
