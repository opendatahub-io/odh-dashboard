import * as React from 'react';
type DeleteModalProps = {
    title: string;
    onClose: () => void;
    deleting: boolean;
    onDelete: () => void;
    deleteName: string;
    submitButtonLabel?: string;
    error?: Error;
    children: React.ReactNode;
    testId?: string;
    genericLabel?: boolean;
};
declare const DeleteModal: React.FC<DeleteModalProps>;
export default DeleteModal;
