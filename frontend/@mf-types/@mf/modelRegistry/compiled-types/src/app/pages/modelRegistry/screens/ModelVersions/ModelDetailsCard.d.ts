import React from 'react';
import { ModelRegistryCustomProperties, RegisteredModel } from '~/app/types';
type ModelDetailsCardProps = {
    registeredModel: RegisteredModel;
    refresh: () => void;
    isArchiveModel?: boolean;
    isExpandable?: boolean;
    /** If `model_type` is absent on the registered model, read from these (e.g. version custom properties). */
    modelTypeFallbackCustomProperties?: ModelRegistryCustomProperties;
};
declare const ModelDetailsCard: React.FC<ModelDetailsCardProps>;
export default ModelDetailsCard;
