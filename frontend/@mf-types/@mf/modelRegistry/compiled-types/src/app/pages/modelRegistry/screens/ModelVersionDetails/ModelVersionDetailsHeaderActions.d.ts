import * as React from 'react';
import { ModelVersion } from '~/app/types';
interface ModelVersionsDetailsHeaderActionsProps {
    mv: ModelVersion;
    refresh: () => void;
}
declare const ModelVersionsDetailsHeaderActions: React.FC<ModelVersionsDetailsHeaderActionsProps>;
export default ModelVersionsDetailsHeaderActions;
