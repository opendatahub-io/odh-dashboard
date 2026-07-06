import React from 'react';
import { ModelVersion } from '~/app/types';
type DeployModalExtensionProps = {
    mv: ModelVersion;
    render: (buttonState: {
        enabled?: boolean;
        tooltip?: string;
    }, onOpenModal: () => void, isModalAvailable: boolean) => React.ReactNode;
};
declare const DeployModalExtension: React.FC<DeployModalExtensionProps>;
export default DeployModalExtension;
