import React from 'react';
import { RoleBindingPermissionsRoleType } from './types';
type RoleBindingPermissionsPermissionSelectionProps = {
    selection: RoleBindingPermissionsRoleType;
    permissionOptions: {
        type: RoleBindingPermissionsRoleType;
        description: string;
    }[];
    onSelect: (roleType: RoleBindingPermissionsRoleType) => void;
};
declare const RoleBindingPermissionsPermissionSelection: React.FC<RoleBindingPermissionsPermissionSelectionProps>;
export default RoleBindingPermissionsPermissionSelection;
