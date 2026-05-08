import React from 'react';
import { UpdateObjectAtPropAndValue } from 'mod-arch-shared';
import { RegistrationCommonFormData } from './useRegisterModelData';
type RegisterAndStoreFieldsProps<D extends RegistrationCommonFormData> = {
    formData: D;
    setData: UpdateObjectAtPropAndValue<D>;
    isCatalogModel?: boolean;
    namespaceHasAccess?: boolean;
    isNamespaceAccessLoading?: boolean;
    namespaceAccessError?: Error | undefined;
    namespaceCannotCheck?: boolean;
    registryName?: string;
};
declare const RegisterAndStoreFields: <D extends RegistrationCommonFormData>({ formData, setData, isCatalogModel, namespaceHasAccess, isNamespaceAccessLoading, namespaceAccessError, namespaceCannotCheck, registryName, }: RegisterAndStoreFieldsProps<D>) => React.ReactNode;
export default RegisterAndStoreFields;
