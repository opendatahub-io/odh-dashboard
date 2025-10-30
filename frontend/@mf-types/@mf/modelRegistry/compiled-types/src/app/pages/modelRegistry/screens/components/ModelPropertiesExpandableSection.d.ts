import React from 'react';
import { ModelRegistryCustomProperties } from '~/app/types';
type ModelPropertiesExpandableSectionProps = {
    customProperties?: ModelRegistryCustomProperties;
    isArchive?: boolean;
    saveEditedCustomProperties: (properties: ModelRegistryCustomProperties) => Promise<unknown>;
    isExpandedByDefault?: boolean;
    onEditingChange?: (isEditing: boolean) => void;
    modelName?: string;
};
declare const ModelPropertiesExpandableSection: React.FC<ModelPropertiesExpandableSectionProps>;
export default ModelPropertiesExpandableSection;
