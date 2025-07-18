import { RoleBindingKind, K8sStatus } from 'mod-arch-shared';
export declare const createModelRegistryRoleBindingWrapper: (roleBinding: RoleBindingKind) => Promise<RoleBindingKind>;
export declare const deleteModelRegistryRoleBindingWrapper: (name: string) => Promise<K8sStatus>;
