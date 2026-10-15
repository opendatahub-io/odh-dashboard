import * as React from 'react';
type CatalogSourceStatusErrorModalProps = {
    isOpen: boolean;
    onClose: () => void;
    errorMessage: string;
    validationFailedTitle?: string;
    validationFailedBody?: string;
    testId?: string;
};
declare const CatalogSourceStatusErrorModal: React.FC<CatalogSourceStatusErrorModalProps>;
export default CatalogSourceStatusErrorModal;
