import * as React from 'react';
interface RestoreModelVersionModalProps {
    onCancel: () => void;
    onSubmit: () => void;
    isOpen: boolean;
    modelVersionName: string;
}
export declare const RestoreModelVersionModal: React.FC<RestoreModelVersionModalProps>;
export {};
