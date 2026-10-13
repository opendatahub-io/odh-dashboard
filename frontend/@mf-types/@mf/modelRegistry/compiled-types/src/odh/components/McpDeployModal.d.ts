import React from 'react';
import { McpDeployment, McpDeployModalData } from '~/odh/types/mcpDeploymentTypes';
type McpDeployModalProps = {
    isOpen?: boolean;
    onClose: (saved?: boolean) => void;
    data?: McpDeployModalData;
    isLoading?: boolean;
    loadError?: Error;
    /**
     * Called after the CR is created, before `onClose`, for caller-specific follow-up.
     * Should catch and report its own errors — a rejection here doesn't fail the deploy itself.
     */
    onDeployed?: (deployment: McpDeployment) => void | Promise<void>;
};
declare const McpDeployModal: React.FC<McpDeployModalProps>;
export default McpDeployModal;
