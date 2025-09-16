import * as React from 'react';
import { ModelVersion, ModelArtifactList } from '~/app/types';
type ModelVersionDetailsViewProps = {
    modelVersion: ModelVersion;
    isArchiveVersion?: boolean;
    refresh: () => void;
    modelArtifacts: ModelArtifactList;
};
declare const ModelVersionDetailsView: React.FC<ModelVersionDetailsViewProps>;
export default ModelVersionDetailsView;
