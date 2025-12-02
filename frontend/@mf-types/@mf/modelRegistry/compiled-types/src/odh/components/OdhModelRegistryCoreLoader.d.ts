import * as React from 'react';
type OdhModelRegistryCoreLoaderProps = {
    getInvalidRedirectPath: (modelRegistry: string) => string;
};
/**
 * ODH-specific override of ModelRegistryCoreLoader that includes admin user detection
 * for showing appropriate empty states when no model registries are available.
 */
declare const OdhModelRegistryCoreLoader: React.FC<OdhModelRegistryCoreLoaderProps>;
export default OdhModelRegistryCoreLoader;
