import * as React from 'react';
import { RegisteredModel } from '~/app/types';
type RegisteredModelsArchiveListViewProps = {
    registeredModels: RegisteredModel[];
    refresh: () => void;
};
declare const RegisteredModelsArchiveListView: React.FC<RegisteredModelsArchiveListViewProps>;
export default RegisteredModelsArchiveListView;
