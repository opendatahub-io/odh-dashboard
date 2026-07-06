import * as React from 'react';
type ModelRegistrySelectorProps = {
    modelRegistry: string;
    onSelection: (modelRegistry: string) => void;
    primary?: boolean;
    isFullWidth?: boolean;
    hasError?: boolean;
    children?: React.ReactNode;
};
declare const ModelRegistrySelector: React.FC<ModelRegistrySelectorProps>;
export default ModelRegistrySelector;
