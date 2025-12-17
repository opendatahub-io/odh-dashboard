import React from 'react';
import { ModelArtifact } from '~/app/types';
type ModelVersionRegisteredFromLinkProps = {
    modelArtifact: ModelArtifact;
    isModelCatalogAvailable: boolean;
};
declare const ModelVersionRegisteredFromLink: React.FC<ModelVersionRegisteredFromLinkProps>;
export default ModelVersionRegisteredFromLink;
