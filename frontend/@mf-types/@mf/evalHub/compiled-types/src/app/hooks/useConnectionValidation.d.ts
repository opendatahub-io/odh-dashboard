import * as React from 'react';
import type { ConnectionValidationState, SourceMode } from '~/app/types';
type UseConnectionValidationParams = {
    namespace: string | undefined;
    sourceMode: SourceMode;
    endpointUrl: string;
    apiKeySecretRef: string;
    datasetUrl: string;
    accessToken: string;
    modelName: string;
    agentName: string;
};
type UseConnectionValidationResult = {
    connectionValidation: ConnectionValidationState;
    setConnectionValidation: React.Dispatch<React.SetStateAction<ConnectionValidationState>>;
    handleVerifyConnection: () => Promise<void>;
};
export declare const useConnectionValidation: ({ namespace, sourceMode, endpointUrl, apiKeySecretRef, datasetUrl, accessToken, modelName, agentName, }: UseConnectionValidationParams) => UseConnectionValidationResult;
export {};
