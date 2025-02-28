import * as React from 'react';
import ModelRegistrySelector from './ModelRegistrySelector';
type ModelRegistrySelectorNavigatorProps = {
    getRedirectPath: (namespace: string) => string;
} & Omit<React.ComponentProps<typeof ModelRegistrySelector>, 'onSelection' | 'modelRegistry'>;
declare const ModelRegistrySelectorNavigator: React.FC<ModelRegistrySelectorNavigatorProps>;
export default ModelRegistrySelectorNavigator;
