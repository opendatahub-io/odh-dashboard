import React from 'react';
import { RegisteredModel } from '~/app/types';
type RegisteredModelSelectorProps = {
    registeredModels: RegisteredModel[];
    registeredModelId: string;
    setRegisteredModelId: (id: string) => void;
    isDisabled: boolean;
};
declare const RegisteredModelSelector: React.FC<RegisteredModelSelectorProps>;
export default RegisteredModelSelector;
