import * as React from 'react';
type ModelRegistrySelectorProps = {
    modelRegistry: string;
    onSelection: (modelRegistry: string) => void;
    primary?: boolean;
};
declare const ModelRegistrySelector: React.FC<ModelRegistrySelectorProps>;
export default ModelRegistrySelector;
