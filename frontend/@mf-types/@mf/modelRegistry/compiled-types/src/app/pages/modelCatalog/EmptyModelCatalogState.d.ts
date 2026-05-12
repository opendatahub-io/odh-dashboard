import React from 'react';
import { EmptyStateVariant } from '@patternfly/react-core';
type EmptyModelCatalogStateType = {
    testid?: string;
    className?: string;
    title: string;
    description: React.ReactNode;
    headerIcon?: React.ComponentType;
    children?: React.ReactNode;
    primaryAction?: React.ReactNode;
    secondaryAction?: React.ReactNode;
    variant?: EmptyStateVariant;
};
declare const EmptyModelCatalogState: React.FC<EmptyModelCatalogStateType>;
export default EmptyModelCatalogState;
