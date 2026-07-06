import * as React from 'react';
import ModelRegistrySelector from './ModelRegistrySelector';
type ModelRegistrySelectorNavigatorProps = {
    getRedirectPath: (namespace: string) => string;
    children?: React.ReactNode;
} & Omit<React.ComponentProps<typeof ModelRegistrySelector>, 'onSelection' | 'modelRegistry'>;
declare const ModelRegistrySelectorNavigator: React.FC<ModelRegistrySelectorNavigatorProps>;
export default ModelRegistrySelectorNavigator;
