import { GroupKind, RoleBindingKind, FetchStateObject, ModelRegistryKind } from 'mod-arch-shared';
import { useQueryParamNamespaces } from 'mod-arch-core';
import { RoleBindingPermissionsRoleType } from '~/app/pages/settings/roleBinding/types';
import { createModelRegistryRoleBindingWrapper, deleteModelRegistryRoleBindingWrapper, createModelRegistryNamespaceRoleBinding, deleteModelRegistryNamespaceRoleBinding } from '~/app/pages/settings/roleBindingUtils';
export interface ModelRegistryPermissionsConfig {
    activeTabKey: number;
    setActiveTabKey: (key: number) => void;
    ownerReference: ModelRegistryKind | undefined;
    groups: GroupKind[];
    filteredRoleBindings: RoleBindingKind[];
    filteredNamespaceRoleBindings: RoleBindingKind[];
    queryParams: ReturnType<typeof useQueryParamNamespaces>;
    mrName: string | undefined;
    modelRegistryNamespace: string;
    roleBindings: FetchStateObject<RoleBindingKind[]>;
    userPermissionOptions: Array<{
        type: RoleBindingPermissionsRoleType;
        description: string;
    }>;
    namespacePermissionOptions: Array<{
        type: RoleBindingPermissionsRoleType;
        description: string;
    }>;
    createUserRoleBinding: typeof createModelRegistryRoleBindingWrapper;
    deleteUserRoleBinding: typeof deleteModelRegistryRoleBindingWrapper;
    createNamespaceRoleBinding: typeof createModelRegistryNamespaceRoleBinding;
    deleteNamespaceRoleBinding: typeof deleteModelRegistryNamespaceRoleBinding;
    userRoleRefName: string;
    namespaceRoleRefName: string;
    shouldShowError: boolean;
    shouldRedirect: boolean;
}
export declare const useModelRegistryPermissionsLogic: () => ModelRegistryPermissionsConfig;
