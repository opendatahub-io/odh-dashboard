import React from 'react';
type EmptyModelCatalogStateType = {
    testid?: string;
    title: string;
    description: React.ReactNode;
    headerIcon?: React.ComponentType;
    children?: React.ReactNode;
    customAction?: React.ReactNode;
};
declare const EmptyModelCatalogState: React.FC<EmptyModelCatalogStateType>;
export default EmptyModelCatalogState;
