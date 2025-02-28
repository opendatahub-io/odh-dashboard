import * as React from 'react';
import { ModelVersion } from '~/app/types';
type ModelVersionsArchiveListViewProps = {
    modelVersions: ModelVersion[];
    refresh: () => void;
};
declare const ModelVersionsArchiveListView: React.FC<ModelVersionsArchiveListViewProps>;
export default ModelVersionsArchiveListView;
