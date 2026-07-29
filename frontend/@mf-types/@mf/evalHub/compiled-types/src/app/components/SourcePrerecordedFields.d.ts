import * as React from 'react';
import type { ConnectionValidationState } from '~/app/types';
type SourcePrerecordedFieldsProps = {
    sourceName: string;
    onSourceNameChange: (val: string) => void;
    datasetUrl: string;
    onDatasetUrlChange: (val: string) => void;
    accessToken: string;
    onAccessTokenChange: (val: string) => void;
    datasetUrlError: string | undefined;
    touched: Record<string, boolean>;
    markTouched: (field: string) => void;
    connectionValidation: ConnectionValidationState;
    canVerifyConnection: boolean;
    onVerifyConnection: () => void;
};
declare const SourcePrerecordedFields: React.FC<SourcePrerecordedFieldsProps>;
export default SourcePrerecordedFields;
