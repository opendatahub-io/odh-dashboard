import * as React from 'react';
import { K8sResourceCommon, K8sStatus, RoleBindingKind, RoleBindingRoleRef, RoleBindingSubject } from 'mod-arch-shared';
import { RoleBindingPermissionsRoleType } from './types';
type RoleBindingPermissionsTableProps = {
    ownerReference?: K8sResourceCommon;
    subjectKind: RoleBindingSubject['kind'];
    namespace: string;
    roleRefKind: RoleBindingRoleRef['kind'];
    roleRefName?: RoleBindingRoleRef['name'];
    labels?: {
        [key: string]: string;
    };
    isProjectSubject?: boolean;
    defaultRoleBindingName?: string;
    permissions: RoleBindingKind[];
    permissionOptions: {
        type: RoleBindingPermissionsRoleType;
        description: string;
    }[];
    isAdding: boolean;
    typeAhead?: string[];
    createRoleBinding: (roleBinding: RoleBindingKind) => Promise<RoleBindingKind>;
    deleteRoleBinding: (name: string, namespace: string) => Promise<K8sStatus>;
    onDismissNewRow: () => void;
    onError: (error: React.ReactNode) => void;
    refresh: () => void;
};
declare const RoleBindingPermissionsTable: React.FC<RoleBindingPermissionsTableProps>;
export default RoleBindingPermissionsTable;
