import * as React from 'react';
import { RegisteredModel, ModelVersion } from '~/app/types';
interface ModelVersionsHeaderActionsProps {
    rm: RegisteredModel;
    latestModelVersion?: ModelVersion;
}
declare const ModelVersionsHeaderActions: React.FC<ModelVersionsHeaderActionsProps>;
export default ModelVersionsHeaderActions;
