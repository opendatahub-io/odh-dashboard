import * as React from 'react';
type CatalogSourceStatusErrorModalProps = {
    isOpen: boolean;
    onClose: () => void;
    errorMessage: string;
};
declare const CatalogSourceStatusErrorModal: React.FC<CatalogSourceStatusErrorModalProps>;
export default CatalogSourceStatusErrorModal;
