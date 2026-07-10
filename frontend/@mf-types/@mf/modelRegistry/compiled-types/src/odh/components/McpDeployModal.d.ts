import React from 'react';
import { McpDeployModalData } from '~/odh/types/mcpDeploymentTypes';
type McpDeployModalProps = {
    isOpen?: boolean;
    onClose: (saved?: boolean) => void;
    data?: McpDeployModalData;
};
declare const McpDeployModal: React.FC<McpDeployModalProps>;
export default McpDeployModal;
