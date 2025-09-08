import React from 'react';
import { ModelRegistryCustomProperties } from '~/app/types';
type ModelPropertiesExpandableSectionProps = {
    customProperties?: ModelRegistryCustomProperties;
    isArchive?: boolean;
    saveEditedCustomProperties: (properties: ModelRegistryCustomProperties) => Promise<unknown>;
};
declare const ModelPropertiesExpandableSection: React.FC<ModelPropertiesExpandableSectionProps>;
export default ModelPropertiesExpandableSection;
