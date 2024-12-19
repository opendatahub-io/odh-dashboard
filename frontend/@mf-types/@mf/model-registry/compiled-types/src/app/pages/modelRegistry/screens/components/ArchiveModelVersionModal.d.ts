import * as React from 'react';
interface ArchiveModelVersionModalProps {
    onCancel: () => void;
    onSubmit: () => void;
    isOpen: boolean;
    modelVersionName: string;
}
export declare const ArchiveModelVersionModal: React.FC<ArchiveModelVersionModalProps>;
export {};
