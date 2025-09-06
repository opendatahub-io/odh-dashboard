import * as React from 'react';
import { ModelVersion, ModelArtifactList } from '~/app/types';
type ModelVersionDetailTabsProps = {
    tab: string;
    modelVersion: ModelVersion;
    isArchiveVersion?: boolean;
    refresh: () => void;
    modelArtifacts: ModelArtifactList;
};
declare const ModelVersionDetailsTabs: React.FC<ModelVersionDetailTabsProps>;
export default ModelVersionDetailsTabs;
