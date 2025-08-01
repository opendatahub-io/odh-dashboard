import React from 'react';
import { RegisteredModel } from '~/app/types';
type ModelDetailsCardProps = {
    registeredModel: RegisteredModel;
    refresh: () => void;
    isArchiveModel?: boolean;
};
declare const ModelDetailsCard: React.FC<ModelDetailsCardProps>;
export default ModelDetailsCard;
