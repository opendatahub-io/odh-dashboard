import * as React from 'react';
import { FetchStateObject, GroupKind, K8sResourceCommon, K8sStatus, RoleBindingKind, RoleBindingRoleRef } from 'mod-arch-shared';
import { RoleBindingPermissionsRoleType } from './types';
type RoleBindingPermissionsProps = {
    ownerReference?: K8sResourceCommon;
    roleBindingPermissionsRB: FetchStateObject<RoleBindingKind[]>;
    defaultRoleBindingName?: string;
    permissionOptions: {
        type: RoleBindingPermissionsRoleType;
        description: string;
    }[];
    createRoleBinding: (roleBinding: RoleBindingKind) => Promise<RoleBindingKind>;
    deleteRoleBinding: (name: string, namespace: string) => Promise<K8sStatus>;
    projectName: string;
    roleRefKind: RoleBindingRoleRef['kind'];
    roleRefName?: RoleBindingRoleRef['name'];
    labels?: {
        [key: string]: string;
    };
    description: React.ReactElement | string;
    groups: GroupKind[];
    isGroupFirst?: boolean;
    isProjectSubject?: boolean;
};
declare const RoleBindingPermissions: React.FC<RoleBindingPermissionsProps>;
export default RoleBindingPermissions;
