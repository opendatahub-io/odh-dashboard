import * as React from 'react';
import { RegisteredModel } from '~/app/types';
interface ModelVersionsHeaderActionsProps {
    rm: RegisteredModel;
    hasDeployments?: boolean;
}
declare const ModelVersionsHeaderActions: React.FC<ModelVersionsHeaderActionsProps>;
export default ModelVersionsHeaderActions;
