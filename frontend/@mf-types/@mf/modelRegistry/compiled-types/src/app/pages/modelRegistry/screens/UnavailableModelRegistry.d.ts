import * as React from 'react';
export declare const UNAVAILABLE_TITLE = "Model registry unavailable";
export declare const getUnavailableBodyText: (registryDisplayName: string) => string;
type UnavailableModelRegistryProps = {
    /** Display name of the selected registry, shown in the message (e.g. "Unavailable Registry Example"). */
    registryDisplayName: string;
};
declare const UnavailableModelRegistry: React.FC<UnavailableModelRegistryProps>;
export default UnavailableModelRegistry;
