import React from 'react';
import { UpdateObjectAtPropAndValue } from 'mod-arch-shared';
import { RegisterModelFormData } from './useRegisterModelData';
type RegisterModelDetailsFormSectionProp<D extends RegisterModelFormData> = {
    formData: D;
    setData: UpdateObjectAtPropAndValue<D>;
    hasModelNameError: boolean;
    isModelNameDuplicate?: boolean;
    /** When true (MR register-from-registry), model type is required; submit stays disabled until set. */
    isModelTypeRequired?: boolean;
    /** When true (catalog → MR), model type is prefilled from catalog metadata and is not editable. */
    isModelTypeReadOnly?: boolean;
};
declare const RegisterModelDetailsFormSection: <D extends RegisterModelFormData>({ formData, setData, hasModelNameError, isModelNameDuplicate, isModelTypeRequired, isModelTypeReadOnly, }: RegisterModelDetailsFormSectionProp<D>) => React.ReactNode;
export default RegisterModelDetailsFormSection;
