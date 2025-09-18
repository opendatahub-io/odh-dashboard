import React from 'react';
import { ModelVersion } from '~/app/types';
import { ModelDeployPrefillInfo } from '~/odh/hooks/useRegisteredModelDeployPrefillInfo';
declare const MRDeployFormDataLoader: ({ mv, renderData, }: {
    mv: ModelVersion;
    renderData: (modelDeployPrefill: {
        data: ModelDeployPrefillInfo;
        loaded: boolean;
        error: Error | undefined;
    }, onSubmit: () => void) => React.ReactNode;
}) => React.ReactNode;
export default MRDeployFormDataLoader;
