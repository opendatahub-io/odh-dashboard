import { RoleBindingKind } from 'mod-arch-shared';
import { ProjectKind, NamespaceKind } from '~/app/shared/components/types';
import { RoleBindingPermissionsRBType, RoleBindingPermissionsRoleType } from './types';
export declare const filterRoleBindingSubjects: (roleBindings: RoleBindingKind[], type: RoleBindingPermissionsRBType) => RoleBindingKind[];
export declare const castRoleBindingPermissionsRoleType: (role: string) => RoleBindingPermissionsRoleType;
export declare const firstSubject: (roleBinding: RoleBindingKind, isProjectSubject?: boolean, project?: ProjectKind[]) => string;
export declare const roleLabel: (value: RoleBindingPermissionsRoleType) => string;
export declare const isCurrentUserChanging: (roleBinding: RoleBindingKind | undefined, currentUsername: string) => boolean;
export declare const tryPatchRoleBinding: (oldRBObject: RoleBindingKind, newRBObject: RoleBindingKind) => Promise<boolean>;
export declare const namespaceToProjectDisplayName: (namespace: string, projects: ProjectKind[]) => string;
export declare const projectDisplayNameToNamespace: (displayName: string, projects: ProjectKind[]) => string;
/**
 * Get the display name for a namespace.
 * @param namespaceName The name of the namespace
 * @param namespaces Array of NamespaceKind objects
 * @returns The display name or namespace name if not found
 */
export declare const namespaceToDisplayName: (namespaceName: string, namespaces: NamespaceKind[]) => string;
/**
 * Find a namespace by its display name.
 * @param displayName The display name to search for
 * @param namespaces Array of NamespaceKind objects
 * @returns The namespace name or the display name if not found
 */
export declare const displayNameToNamespace: (displayName: string, namespaces: NamespaceKind[]) => string;
