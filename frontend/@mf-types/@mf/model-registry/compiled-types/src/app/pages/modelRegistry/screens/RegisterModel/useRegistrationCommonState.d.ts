import React from 'react';
import { ModelRegistryAPIState } from '~/app/context/useModelRegistryAPIState';
type RegistrationCommonState = {
    isSubmitting: boolean;
    setIsSubmitting: React.Dispatch<React.SetStateAction<boolean>>;
    submitError: Error | undefined;
    setSubmitError: React.Dispatch<React.SetStateAction<Error | undefined>>;
    handleSubmit: (doSubmit: () => Promise<unknown>) => void;
    apiState: ModelRegistryAPIState;
    author: string;
};
export declare const useRegistrationCommonState: () => RegistrationCommonState;
export {};
