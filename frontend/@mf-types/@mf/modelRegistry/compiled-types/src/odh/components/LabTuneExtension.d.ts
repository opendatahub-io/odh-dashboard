import React from 'react';
import type { ModelVersion, RegisteredModel } from '~/app/types';
type LabTuneExtensionProps = {
    mv: ModelVersion;
    registeredModel?: RegisteredModel;
    render: (labTuneState: {
        enabled?: boolean;
        tooltip?: string;
    }, onOpenModal: () => void, isModalAvailable: boolean) => React.ReactNode;
};
declare const LabTuneExtension: React.FC<LabTuneExtensionProps>;
export default LabTuneExtension;
