import React from 'react';
import { EmptyStateVariant } from '@patternfly/react-core';
type EmptyCatalogStateProps = {
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
declare const EmptyCatalogState: React.FC<EmptyCatalogStateProps>;
export default EmptyCatalogState;
