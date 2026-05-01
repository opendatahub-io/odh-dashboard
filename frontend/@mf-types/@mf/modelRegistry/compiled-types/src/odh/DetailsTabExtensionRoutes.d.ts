import React from 'react';
import { LoadedExtension } from '@openshift/dynamic-plugin-sdk';
import { ModelRegistryDetailsTabExtension } from '~/odh/extension-points/details';
export declare const generateDetailsTabExtensionRoutes: ({ tabExtensions, }: {
    tabExtensions: LoadedExtension<ModelRegistryDetailsTabExtension>[];
}) => React.ReactElement[];
