import React from 'react';
import { UpdateObjectAtPropAndValue } from 'mod-arch-shared';
import { RegistrationCommonFormData } from './useRegisterModelData';
type RegistrationDestinationLocationFieldsProps<D extends RegistrationCommonFormData> = {
    formData: D;
    setData: UpdateObjectAtPropAndValue<D>;
};
declare const RegistrationDestinationLocationFields: <D extends RegistrationCommonFormData>({ formData, setData, }: RegistrationDestinationLocationFieldsProps<D>) => React.ReactNode;
export default RegistrationDestinationLocationFields;
