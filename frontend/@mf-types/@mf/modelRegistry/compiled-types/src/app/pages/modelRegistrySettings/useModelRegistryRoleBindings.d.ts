import { FetchStateObject } from 'mod-arch-core';
import { RoleBindingKind } from 'mod-arch-shared';
declare const useModelRegistryRoleBindings: (queryParams: Record<string, unknown>) => FetchStateObject<RoleBindingKind[]>;
export default useModelRegistryRoleBindings;
