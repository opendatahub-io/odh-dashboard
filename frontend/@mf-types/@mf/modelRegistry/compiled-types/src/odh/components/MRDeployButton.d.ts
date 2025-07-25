import React from 'react';
import { ModelVersion } from '~/app/types';
export declare const MRDeployButton: ({ mv, mvLoaded, mvError, }: {
    mv: ModelVersion;
    mvLoaded: boolean;
    mvError: Error | undefined;
}) => React.JSX.Element;
