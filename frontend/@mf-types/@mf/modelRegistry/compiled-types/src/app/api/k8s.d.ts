import { APIOptions, Namespace, UserSettings, ModelRegistryKind, GroupKind, RoleBindingKind, K8sResourceCommon, RoleBindingSubject, RoleBindingRoleRef } from 'mod-arch-shared';
import { ModelRegistry, ModelRegistryPayload } from '~/app/types';
import { RoleBindingPermissionsRoleType } from '~/app/pages/settings/roleBinding/types';
export declare const getListModelRegistries: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions) => Promise<ModelRegistry[]>;
export declare const getUser: (hostPath: string) => (opts: APIOptions) => Promise<UserSettings>;
export declare const getNamespaces: (hostPath: string) => (opts: APIOptions) => Promise<Namespace[]>;
export declare const getNamespacesForSettings: (hostPath: string) => (opts: APIOptions) => Promise<Namespace[]>;
export declare const getGroups: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions) => Promise<GroupKind[]>;
export declare const getRoleBindings: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions) => Promise<RoleBindingKind[]>;
export declare const getModelRegistrySettings: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions, modelRegistryId: string) => Promise<ModelRegistryKind>;
export declare const listModelRegistrySettings: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions) => Promise<ModelRegistryKind[]>;
export declare const createModelRegistrySettings: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions, data: ModelRegistryPayload) => Promise<ModelRegistryKind>;
export declare const deleteModelRegistrySettings: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions, data: ModelRegistryKind, modelRegistryId: string) => Promise<ModelRegistryKind[]>;
export declare const patchModelRegistrySettings: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions, data: ModelRegistryKind, modelRegistryId: string) => Promise<ModelRegistryKind[]>;
export declare const createRoleBinding: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions, data: RoleBindingKind) => Promise<RoleBindingKind>;
export declare const patchRoleBinding: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions, data: RoleBindingKind, roleBindingName: string) => Promise<RoleBindingKind>;
export declare const deleteRoleBinding: (hostPath: string, queryParams?: Record<string, unknown>) => (opts: APIOptions, roleBindingName: string) => Promise<void>;
export declare const addOwnerReference: <R extends K8sResourceCommon>(resource: R, owner?: K8sResourceCommon, blockOwnerDeletion?: boolean) => R;
export declare const generateRoleBindingPermissions: (namespace: string, rbSubjectKind: RoleBindingSubject["kind"], rbSubjectName: RoleBindingSubject["name"], rbRoleRefName: RoleBindingPermissionsRoleType | string, //string because with MR this can include MR name
rbRoleRefKind: RoleBindingRoleRef["kind"], rbLabels?: {
    [key: string]: string;
}, ownerReference?: K8sResourceCommon) => RoleBindingKind;
