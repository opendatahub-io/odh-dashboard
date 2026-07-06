import React from 'react';
type EmptyModelRegistryStateType = {
    testid?: string;
    title: string;
    description: string;
    primaryActionText?: string;
    primaryActionOnClick?: () => void;
    secondaryActionText?: string;
    secondaryActionOnClick?: () => void;
    headerIcon?: React.ComponentType;
    customAction?: React.ReactNode;
};
declare const EmptyModelRegistryState: React.FC<EmptyModelRegistryStateType>;
export default EmptyModelRegistryState;
