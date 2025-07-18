import * as React from 'react';
import { K8sResourceCommon, K8sStatus, RoleBindingKind, RoleBindingRoleRef, RoleBindingSubject } from 'mod-arch-shared';
import { RoleBindingPermissionsRoleType } from './types';
export type RoleBindingPermissionsTableSectionAltProps = {
    ownerReference?: K8sResourceCommon;
    roleBindings: RoleBindingKind[];
    projectName: string;
    roleRefKind: RoleBindingRoleRef['kind'];
    roleRefName?: RoleBindingRoleRef['name'];
    subjectKind: RoleBindingSubject['kind'];
    permissionOptions: {
        type: RoleBindingPermissionsRoleType;
        description: string;
    }[];
    typeAhead?: string[];
    createRoleBinding: (roleBinding: RoleBindingKind) => Promise<RoleBindingKind>;
    deleteRoleBinding: (name: string, namespace: string) => Promise<K8sStatus>;
    refresh: () => void;
    typeModifier: string;
    defaultRoleBindingName?: string;
    labels?: {
        [key: string]: string;
    };
    isProjectSubject?: boolean;
};
declare const RoleBindingPermissionsTableSection: React.FC<RoleBindingPermissionsTableSectionAltProps>;
export default RoleBindingPermissionsTableSection;
