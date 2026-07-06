import { RoleBindingKind, K8sStatus } from 'mod-arch-shared';
export declare const createModelRegistryRoleBindingWrapper: (roleBinding: RoleBindingKind) => Promise<RoleBindingKind>;
export declare const deleteModelRegistryRoleBindingWrapper: (name: string, namespace: string) => Promise<K8sStatus>;
export declare const createModelRegistryNamespaceRoleBinding: (roleBinding: RoleBindingKind) => Promise<RoleBindingKind>;
export declare const deleteModelRegistryNamespaceRoleBinding: (name: string, namespace: string) => Promise<K8sStatus>;
