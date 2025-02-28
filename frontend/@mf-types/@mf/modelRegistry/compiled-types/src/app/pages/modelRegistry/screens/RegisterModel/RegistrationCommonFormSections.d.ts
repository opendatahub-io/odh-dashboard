import React from 'react';
import { UpdateObjectAtPropAndValue } from '~/shared/types';
import { ModelVersion } from '~/app/types';
import { RegistrationCommonFormData } from './useRegisterModelData';
type RegistrationCommonFormSectionsProps<D extends RegistrationCommonFormData> = {
    formData: D;
    setData: UpdateObjectAtPropAndValue<D>;
    isFirstVersion: boolean;
    latestVersion?: ModelVersion;
};
declare const RegistrationCommonFormSections: <D extends RegistrationCommonFormData>({ formData, setData, isFirstVersion, latestVersion, }: RegistrationCommonFormSectionsProps<D>) => React.ReactNode;
export default RegistrationCommonFormSections;
