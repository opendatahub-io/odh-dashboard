import * as React from 'react';
import { ModelVersion, ModelArtifactList, RegisteredModel } from '~/app/types';
type ModelVersionDetailTabsProps = {
    tab: string;
    registeredModel: RegisteredModel | null;
    modelVersion: ModelVersion;
    isArchiveVersion?: boolean;
    refresh: () => void;
    modelArtifacts: ModelArtifactList;
    modelArtifactsLoaded: boolean;
    modelArtifactsLoadError: Error | undefined;
};
declare const ModelVersionDetailsTabs: React.FC<ModelVersionDetailTabsProps>;
export default ModelVersionDetailsTabs;
