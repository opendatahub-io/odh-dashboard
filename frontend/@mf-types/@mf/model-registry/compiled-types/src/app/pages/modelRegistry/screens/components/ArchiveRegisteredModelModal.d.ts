import * as React from 'react';
interface ArchiveRegisteredModelModalProps {
    onCancel: () => void;
    onSubmit: () => void;
    isOpen: boolean;
    registeredModelName: string;
}
export declare const ArchiveRegisteredModelModal: React.FC<ArchiveRegisteredModelModalProps>;
export {};
