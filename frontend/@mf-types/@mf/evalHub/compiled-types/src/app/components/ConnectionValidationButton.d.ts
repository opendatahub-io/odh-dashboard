import * as React from 'react';
import type { ConnectionValidationState } from '~/app/types';
type ConnectionValidationButtonProps = {
    connectionValidation: ConnectionValidationState;
    canVerify: boolean;
    onVerify: () => void;
    isValidating: boolean;
};
declare const ConnectionValidationButton: React.FC<ConnectionValidationButtonProps>;
export default ConnectionValidationButton;
