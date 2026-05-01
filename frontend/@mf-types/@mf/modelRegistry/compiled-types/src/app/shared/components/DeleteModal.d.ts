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
    inputPlaceholder?: string;
    inputHelperText?: string;
    /** When true, append a required indicator (*) after the confirmation prompt. */
    confirmationRequiredIndicator?: boolean;
};
declare const DeleteModal: React.FC<DeleteModalProps>;
export default DeleteModal;
