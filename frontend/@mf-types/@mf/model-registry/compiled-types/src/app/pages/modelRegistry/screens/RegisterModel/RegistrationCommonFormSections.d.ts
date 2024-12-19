import React from 'react';
import { UpdateObjectAtPropAndValue } from '~/shared/types';
import { ModelVersion } from '~/app/types';
import { RegistrationCommonFormData } from './useRegisterModelData';
type RegistrationCommonFormSectionsProps = {
    formData: RegistrationCommonFormData;
    setData: UpdateObjectAtPropAndValue<RegistrationCommonFormData>;
    isFirstVersion: boolean;
    latestVersion?: ModelVersion;
};
declare const RegistrationCommonFormSections: React.FC<RegistrationCommonFormSectionsProps>;
export default RegistrationCommonFormSections;
