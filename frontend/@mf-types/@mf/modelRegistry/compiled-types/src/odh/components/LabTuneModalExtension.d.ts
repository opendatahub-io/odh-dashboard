import React from 'react';
import { ModelVersion } from '~/app/types';
type LabTuneModalExtensionProps = {
    mv: ModelVersion;
    render: (buttonState: {
        enabled: boolean;
        tooltip?: string;
    }, onOpenModal: () => void, isModalAvailable: boolean) => React.ReactNode;
};
declare const LabTuneModalExtension: React.FC<LabTuneModalExtensionProps>;
export default LabTuneModalExtension;
