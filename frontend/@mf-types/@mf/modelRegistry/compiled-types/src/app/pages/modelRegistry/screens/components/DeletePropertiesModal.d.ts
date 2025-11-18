import * as React from 'react';
type DeletePropertiesModalProps = {
    isOpen: boolean;
    setIsOpen: (isOpen: boolean) => void;
    deleteProperty: () => Promise<unknown>;
    modelName?: string;
};
declare const DeletePropertiesModal: React.FC<DeletePropertiesModalProps>;
export default DeletePropertiesModal;
