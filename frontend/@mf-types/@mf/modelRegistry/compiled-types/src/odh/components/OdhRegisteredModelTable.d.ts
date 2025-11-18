import * as React from 'react';
import { ModelVersion, RegisteredModel } from '../../app/types';
type RegisteredModelTableWithDeploymentProps = {
    clearFilters: () => void;
    registeredModels: RegisteredModel[];
    modelVersions: ModelVersion[];
    refresh: () => void;
    children: (props: {
        rowRenderer: (rm: RegisteredModel) => JSX.Element;
    }) => React.ReactNode;
};
/**
 * Wrapper component that provides deployment-aware rowRenderer for RegisteredModelTable
 * Encapsulates all deployment detection logic and keeps the core table component clean
 */
export declare const OdhRegisteredModelTableWrapper: React.FC<RegisteredModelTableWithDeploymentProps>;
export {};
