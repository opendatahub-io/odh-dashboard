import React from 'react';
import { UpdateObjectAtPropAndValue } from 'mod-arch-shared';
import { RegistrationCommonFormData } from './useRegisterModelData';
type RegistrationModelLocationFieldsProps<D extends RegistrationCommonFormData> = {
    formData: D;
    setData: UpdateObjectAtPropAndValue<D>;
    isCatalogModel?: boolean;
    includeCredentialFields?: boolean;
};
declare const RegistrationModelLocationFields: <D extends RegistrationCommonFormData>({ formData, setData, isCatalogModel, includeCredentialFields, }: RegistrationModelLocationFieldsProps<D>) => React.ReactNode;
export default RegistrationModelLocationFields;
