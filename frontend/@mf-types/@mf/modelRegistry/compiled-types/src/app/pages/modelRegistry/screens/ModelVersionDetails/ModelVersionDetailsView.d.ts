import * as React from 'react';
import { ModelVersion } from '~/app/types';
type ModelVersionDetailsViewProps = {
    modelVersion: ModelVersion;
    isArchiveVersion?: boolean;
    refresh: () => void;
};
declare const ModelVersionDetailsView: React.FC<ModelVersionDetailsViewProps>;
export default ModelVersionDetailsView;
