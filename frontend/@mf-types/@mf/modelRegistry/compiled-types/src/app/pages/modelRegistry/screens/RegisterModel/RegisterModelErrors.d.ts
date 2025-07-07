import React from 'react';
type RegisterModelErrorProp = {
    submitLabel: string;
    submitError: Error;
    registrationErrorType?: string;
    versionName?: string;
    modelName?: string;
};
declare const RegisterModelErrors: React.FC<RegisterModelErrorProp>;
export default RegisterModelErrors;
