import * as React from 'react';
type ModelRegistryCoreLoaderProps = {
    getInvalidRedirectPath: (modelRegistry: string) => string;
    emptyStatePage?: React.ReactNode;
    unavailableStatePage?: (registryDisplayName: string) => React.ReactNode;
};
declare const ModelRegistryCoreLoader: React.FC<ModelRegistryCoreLoaderProps>;
export default ModelRegistryCoreLoader;
