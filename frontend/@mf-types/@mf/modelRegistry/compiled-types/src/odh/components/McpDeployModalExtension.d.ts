import React from 'react';
type McpDeployModalExtensionProps = {
    render: (buttonState: {
        enabled: boolean;
        loading?: boolean;
        tooltip?: string;
    }, onOpenModal: () => void, isModalAvailable: boolean) => React.ReactNode;
};
declare const McpDeployModalExtension: React.FC<McpDeployModalExtensionProps>;
export default McpDeployModalExtension;
