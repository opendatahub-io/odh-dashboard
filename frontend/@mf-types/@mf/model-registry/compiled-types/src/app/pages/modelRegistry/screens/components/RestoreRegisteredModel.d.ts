import * as React from 'react';
interface RestoreRegisteredModelModalProps {
    onCancel: () => void;
    onSubmit: () => void;
    isOpen: boolean;
    registeredModelName: string;
}
export declare const RestoreRegisteredModelModal: React.FC<RestoreRegisteredModelModalProps>;
export {};
