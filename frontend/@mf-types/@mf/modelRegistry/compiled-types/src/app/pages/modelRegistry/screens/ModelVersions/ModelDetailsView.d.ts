import * as React from 'react';
import { RegisteredModel } from '~/app/types';
type ModelDetailsViewProps = {
    registeredModel: RegisteredModel;
    refresh: () => void;
    isArchiveModel?: boolean;
};
declare const ModelDetailsView: React.FC<ModelDetailsViewProps>;
export default ModelDetailsView;
