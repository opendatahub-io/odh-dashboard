import * as React from 'react';
import type { ConnectionValidationState } from '~/app/types';
type SourceModelFieldsProps = {
    modelName: string;
    onModelNameChange: (val: string) => void;
    endpointUrl: string;
    onEndpointUrlChange: (val: string) => void;
    apiKeySecretRef: string;
    onApiKeyChange: (val: string) => void;
    endpointUrlError: string | undefined;
    touched: Record<string, boolean>;
    markTouched: (field: string) => void;
    connectionValidation: ConnectionValidationState;
    canVerifyConnection: boolean;
    onVerifyConnection: () => void;
};
declare const SourceModelFields: React.FC<SourceModelFieldsProps>;
export default SourceModelFields;
