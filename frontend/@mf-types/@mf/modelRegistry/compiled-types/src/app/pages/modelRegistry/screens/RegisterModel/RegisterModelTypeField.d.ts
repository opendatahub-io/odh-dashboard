import React from 'react';
import { ModelRegistryCustomProperties } from '~/app/types';
type RegisterModelTypeFieldProps = {
    modelCustomProperties: ModelRegistryCustomProperties | undefined;
    onModelCustomPropertiesChange: (next: ModelRegistryCustomProperties) => void;
    isRequired?: boolean;
    /** Catalog registration: type is catalog metadata (like URI), not user-editable. */
    isReadOnly?: boolean;
};
declare const RegisterModelTypeField: React.FC<RegisterModelTypeFieldProps>;
export default RegisterModelTypeField;
