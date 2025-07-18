import * as React from 'react';
import { ModelVersion, RegisteredModel } from '~/app/types';
import { ModelVersionsTab } from '~/app/pages/modelRegistry/screens/ModelVersions/const';
type ModelVersionsTabProps = {
    tab: ModelVersionsTab;
    registeredModel: RegisteredModel;
    modelVersions: ModelVersion[];
    isArchiveModel?: boolean;
    refresh: () => void;
    mvRefresh: () => void;
};
declare const ModelVersionsTabs: React.FC<ModelVersionsTabProps>;
export default ModelVersionsTabs;
