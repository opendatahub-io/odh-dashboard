import * as React from 'react';
import { RegisteredModel } from '~/app/types';
type ModelVersionsCardProps = {
    rm: RegisteredModel;
    isArchiveModel?: boolean;
};
declare const ModelVersionsCard: React.FC<ModelVersionsCardProps>;
export default ModelVersionsCard;
