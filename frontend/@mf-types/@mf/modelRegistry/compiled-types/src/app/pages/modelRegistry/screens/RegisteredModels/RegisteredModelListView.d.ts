import * as React from 'react';
import { ModelVersion, RegisteredModel } from '~/app/types';
type RegisteredModelListViewProps = {
    registeredModels: RegisteredModel[];
    modelVersions: ModelVersion[];
    refresh: () => void;
};
declare const RegisteredModelListView: React.FC<RegisteredModelListViewProps>;
export default RegisteredModelListView;
