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
};
declare const RegistrationCommonFormSections: <D extends RegistrationCommonFormData>({ formData, setData, isFirstVersion, latestVersion, isCatalogModel, }: RegistrationCommonFormSectionsProps<D>) => React.ReactNode;
export default RegistrationCommonFormSections;
