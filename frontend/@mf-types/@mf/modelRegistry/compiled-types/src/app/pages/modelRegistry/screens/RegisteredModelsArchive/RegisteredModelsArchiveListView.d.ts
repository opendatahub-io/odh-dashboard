import * as React from 'react';
import { ModelVersion, RegisteredModel } from '~/app/types';
type RegisteredModelsArchiveListViewProps = {
    registeredModels: RegisteredModel[];
    modelVersions: ModelVersion[];
    refresh: () => void;
};
declare const RegisteredModelsArchiveListView: React.FC<RegisteredModelsArchiveListViewProps>;
export default RegisteredModelsArchiveListView;
