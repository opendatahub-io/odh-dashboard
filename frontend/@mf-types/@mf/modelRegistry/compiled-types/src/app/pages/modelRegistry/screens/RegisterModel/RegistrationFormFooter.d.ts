import React from 'react';
type RegistrationFormFooterProps = {
    submitLabel: string;
    submitError?: Error;
    isSubmitDisabled: boolean;
    isSubmitting: boolean;
    onSubmit: () => void;
    onCancel: () => void;
    registrationErrorType?: string;
    versionName?: string;
    modelName?: string;
};
declare const RegistrationFormFooter: React.FC<RegistrationFormFooterProps>;
export default RegistrationFormFooter;
