import * as React from 'react';
import { RoleBindingKind, RoleBindingSubject } from 'mod-arch-shared';
import { RoleBindingPermissionsRoleType } from './types';
type RoleBindingPermissionsTableRowProps = {
    roleBindingObject?: RoleBindingKind;
    subjectKind: RoleBindingSubject['kind'];
    defaultRoleBindingName?: string;
    permissionOptions: {
        type: RoleBindingPermissionsRoleType;
        description: string;
    }[];
    typeAhead?: string[];
    isProjectSubject?: boolean;
    isEditing?: boolean;
    isAdding?: boolean;
    onChange?: (subjectName: string, roleRefName: string) => void;
    onCancel?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
};
declare const RoleBindingPermissionsTableRow: React.FC<RoleBindingPermissionsTableRowProps>;
export default RoleBindingPermissionsTableRow;
