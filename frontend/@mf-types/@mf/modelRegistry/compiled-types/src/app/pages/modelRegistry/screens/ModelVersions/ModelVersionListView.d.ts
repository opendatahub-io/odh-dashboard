import * as React from 'react';
import { ModelVersion, RegisteredModel } from '~/app/types';
type ModelVersionListViewProps = {
    modelVersions: ModelVersion[];
    registeredModel: RegisteredModel;
    isArchiveModel?: boolean;
    refresh: () => void;
};
declare const ModelVersionListView: React.FC<ModelVersionListViewProps>;
export default ModelVersionListView;
