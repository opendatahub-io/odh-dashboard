import React from 'react';
import type { ModelDeployPrefillInfo } from '@odh-dashboard/model-serving/shared/types/deploy-prefill';
import { ModelVersion } from '~/app/types';
declare const MRDeployFormDataLoader: ({ mv, renderData, }: {
    mv: ModelVersion;
    renderData: (modelDeployPrefill: {
        data: ModelDeployPrefillInfo;
        loaded: boolean;
        error: Error | undefined;
    }, onSubmit: () => void) => React.ReactNode;
}) => React.ReactNode;
export default MRDeployFormDataLoader;
