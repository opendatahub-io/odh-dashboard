import React from 'react';
import { ModelVersion, RegisteredModel } from '~/app/types';
type ModelLabelsProps = {
    name: string;
    customProperties: RegisteredModel['customProperties'] | ModelVersion['customProperties'];
};
declare const ModelLabels: React.FC<ModelLabelsProps>;
export default ModelLabels;
