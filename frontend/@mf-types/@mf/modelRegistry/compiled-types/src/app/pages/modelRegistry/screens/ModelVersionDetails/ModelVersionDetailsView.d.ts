import * as React from 'react';
import { ModelVersion, ModelArtifactList, RegisteredModel } from '~/app/types';
type ModelVersionDetailsViewProps = {
    registeredModel: RegisteredModel | null;
    modelVersion: ModelVersion;
    isArchiveVersion?: boolean;
    refresh: () => void;
    modelArtifacts: ModelArtifactList;
    modelArtifactsLoaded: boolean;
    modelArtifactsLoadError: Error | undefined;
};
declare const ModelVersionDetailsView: React.FC<ModelVersionDetailsViewProps>;
export default ModelVersionDetailsView;
