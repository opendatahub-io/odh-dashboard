import * as React from 'react';
import { ModelArtifact } from '~/app/types';
type ModelVersionRegisteredFromLinkProps = {
    modelArtifact: ModelArtifact | null;
    isModelCatalogAvailable: boolean;
};
export declare const ModelVersionRegisteredFromLink: React.FC<ModelVersionRegisteredFromLinkProps>;
export default ModelVersionRegisteredFromLink;
