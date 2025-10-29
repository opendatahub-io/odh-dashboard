import * as React from 'react';
type ModelRegistryCoreLoaderProps = {
    getInvalidRedirectPath: (modelRegistry: string) => string;
    emptyStatePage?: React.ReactNode;
};
declare const ModelRegistryCoreLoader: React.FC<ModelRegistryCoreLoaderProps>;
export default ModelRegistryCoreLoader;
