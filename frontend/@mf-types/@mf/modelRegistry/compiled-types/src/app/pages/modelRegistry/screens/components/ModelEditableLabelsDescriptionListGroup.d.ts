import React from 'react';
import { RegisteredModel } from '~/app/types';
type ModelEditableLabelsDescriptionListGroupProps = {
    isArchiveModel?: boolean;
    rm: RegisteredModel;
    refresh: () => void;
};
declare const ModelEditableLabelsDescriptionListGroup: React.FC<ModelEditableLabelsDescriptionListGroupProps>;
export default ModelEditableLabelsDescriptionListGroup;
