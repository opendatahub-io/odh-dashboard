import React from 'react';
import { AlertVariant } from '@patternfly/react-core';
export type RegistrationInlineAlert = {
    variant: AlertVariant;
    title: string;
    message: React.ReactNode;
};
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
    inlineAlert?: RegistrationInlineAlert;
};
declare const RegistrationFormFooter: React.FC<RegistrationFormFooterProps>;
export default RegistrationFormFooter;
