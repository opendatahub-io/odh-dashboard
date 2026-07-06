import * as React from 'react';
type RoleBindingPermissionsChangeModalProps = {
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
    isDeleting: boolean;
    roleName?: string;
};
declare const RoleBindingPermissionsChangeModal: React.FC<RoleBindingPermissionsChangeModalProps>;
export default RoleBindingPermissionsChangeModal;
