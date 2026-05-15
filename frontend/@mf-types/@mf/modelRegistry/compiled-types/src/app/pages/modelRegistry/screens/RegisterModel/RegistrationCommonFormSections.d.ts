import React from 'react';
import { UpdateObjectAtPropAndValue } from 'mod-arch-shared';
import { ModelVersion } from '~/app/types';
import { RegistrationCommonFormData } from './useRegisterModelData';
type RegistrationCommonFormSectionsProps<D extends RegistrationCommonFormData> = {
    formData: D;
    setData: UpdateObjectAtPropAndValue<D>;
    isFirstVersion: boolean;
    latestVersion?: ModelVersion;
    isCatalogModel?: boolean;
    namespaceHasAccess?: boolean;
    isNamespaceAccessLoading?: boolean;
    namespaceAccessError?: Error | undefined;
    namespaceCannotCheck?: boolean;
    registryName?: string;
};
declare const RegistrationCommonFormSections: <D extends RegistrationCommonFormData>({ formData, setData, isFirstVersion, latestVersion, isCatalogModel, namespaceHasAccess, isNamespaceAccessLoading, namespaceAccessError, namespaceCannotCheck, registryName, }: RegistrationCommonFormSectionsProps<D>) => React.ReactNode;
export default RegistrationCommonFormSections;
