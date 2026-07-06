import * as React from 'react';
interface RestoreRegisteredModelModalProps {
    onCancel: () => void;
    onSubmit: () => void;
    registeredModelName: string;
}
export declare const RestoreRegisteredModelModal: React.FC<RestoreRegisteredModelModalProps>;
export {};
