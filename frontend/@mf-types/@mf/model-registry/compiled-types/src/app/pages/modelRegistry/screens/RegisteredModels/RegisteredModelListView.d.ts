import * as React from 'react';
import { RegisteredModel } from '~/app/types';
type RegisteredModelListViewProps = {
    registeredModels: RegisteredModel[];
    refresh: () => void;
};
declare const RegisteredModelListView: React.FC<RegisteredModelListViewProps>;
export default RegisteredModelListView;
