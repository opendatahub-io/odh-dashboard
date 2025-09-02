import * as React from 'react';
import { ModelVersion, ModelArtifactList } from '~/app/types';
interface ModelVersionsDetailsHeaderActionsProps {
    mv: ModelVersion;
    refresh: () => void;
    modelArtifacts: ModelArtifactList;
}
declare const ModelVersionsDetailsHeaderActions: React.FC<ModelVersionsDetailsHeaderActionsProps>;
export default ModelVersionsDetailsHeaderActions;
