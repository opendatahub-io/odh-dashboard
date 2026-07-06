import React from 'react';
import { UpdateObjectAtPropAndValue } from 'mod-arch-shared';
import { RegisterModelFormData } from './useRegisterModelData';
type RegisterModelDetailsFormSectionProp<D extends RegisterModelFormData> = {
    formData: D;
    setData: UpdateObjectAtPropAndValue<D>;
    hasModelNameError: boolean;
    isModelNameDuplicate?: boolean;
};
declare const RegisterModelDetailsFormSection: <D extends RegisterModelFormData>({ formData, setData, hasModelNameError, isModelNameDuplicate, }: RegisterModelDetailsFormSectionProp<D>) => React.ReactNode;
export default RegisterModelDetailsFormSection;
