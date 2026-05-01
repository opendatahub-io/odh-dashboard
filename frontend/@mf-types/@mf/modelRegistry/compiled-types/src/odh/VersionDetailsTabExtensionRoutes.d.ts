import React from 'react';
import { LoadedExtension } from '@openshift/dynamic-plugin-sdk';
import { ModelRegistryVersionDetailsTabExtension } from './extension-points';
export declare const generateVersionDetailsTabExtensionRoutes: ({ isModelVersionsArchiveDetails, isArchiveModelVersionDetails, tabExtensions, }: {
    isModelVersionsArchiveDetails?: boolean;
    isArchiveModelVersionDetails?: boolean;
    tabExtensions: LoadedExtension<ModelRegistryVersionDetailsTabExtension>[];
}) => React.ReactElement[];
