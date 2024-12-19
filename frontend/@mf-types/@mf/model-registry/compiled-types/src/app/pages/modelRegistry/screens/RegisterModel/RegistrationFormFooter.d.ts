import React from 'react';
type RegistrationFormFooterProps = {
    submitLabel: string;
    submitError?: Error;
    setSubmitError: (e?: Error) => void;
    isSubmitDisabled: boolean;
    isSubmitting: boolean;
    onSubmit: () => void;
    onCancel: () => void;
};
declare const RegistrationFormFooter: React.FC<RegistrationFormFooterProps>;
export default RegistrationFormFooter;
