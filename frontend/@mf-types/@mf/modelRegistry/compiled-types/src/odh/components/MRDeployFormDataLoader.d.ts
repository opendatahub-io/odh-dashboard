import React from 'react';
import { ModelVersion } from '~/app/types';
import { ModelDeployPrefillInfo } from '~/odh/hooks/useRegisteredModelDeployPrefillInfo';
declare const MRDeployFormDataLoader: ({ mv, mvLoaded, mvError, renderData, }: {
    mv: ModelVersion;
    mvLoaded: boolean;
    mvError: Error | undefined;
    renderData: (data: {
        modelDeployPrefillInfo: ModelDeployPrefillInfo;
        loaded: boolean;
        error: Error | undefined;
        onSubmit: () => void;
    }) => React.ReactNode;
}) => React.ReactNode;
export default MRDeployFormDataLoader;
