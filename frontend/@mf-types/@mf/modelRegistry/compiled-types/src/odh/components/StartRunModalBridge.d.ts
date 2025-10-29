import React from 'react';
import { ModelVersion } from '~/app/types';
type StartRunModalBridgeProps = {
    modelVersion: ModelVersion;
    onSubmit: (selectedProject: string) => void;
    onCancel: () => void;
    loaded?: boolean;
    loadError?: Error | null;
};
declare const StartRunModalBridge: React.FC<StartRunModalBridgeProps>;
export default StartRunModalBridge;
