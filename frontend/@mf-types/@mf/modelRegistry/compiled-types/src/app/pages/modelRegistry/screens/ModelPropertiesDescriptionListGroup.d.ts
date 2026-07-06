import * as React from 'react';
import { ModelRegistryCustomProperties } from '~/app/types';
type ModelPropertiesDescriptionListGroupProps = {
    customProperties: ModelRegistryCustomProperties;
    isArchive?: boolean;
    saveEditedCustomProperties: (properties: ModelRegistryCustomProperties) => Promise<unknown>;
};
declare const ModelPropertiesDescriptionListGroup: React.FC<ModelPropertiesDescriptionListGroupProps>;
export default ModelPropertiesDescriptionListGroup;
