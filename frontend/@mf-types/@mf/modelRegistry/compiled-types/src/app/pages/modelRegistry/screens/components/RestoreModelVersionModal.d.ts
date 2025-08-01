import * as React from 'react';
interface RestoreModelVersionModalProps {
    onCancel: () => void;
    onSubmit: () => void;
    modelVersionName: string;
}
export declare const RestoreModelVersionModal: React.FC<RestoreModelVersionModalProps>;
export {};
