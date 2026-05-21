import React from 'react';
export type NamespaceSelectorFieldProps = {
    selectedNamespace: string;
    onSelect: (namespace: string) => void;
    hasAccess?: boolean | undefined;
    isLoading?: boolean;
    error?: Error | undefined;
    cannotCheck?: boolean;
    registryName?: string;
    selectorOnly?: boolean;
};
declare const NamespaceSelectorField: React.FC<NamespaceSelectorFieldProps>;
export default NamespaceSelectorField;
