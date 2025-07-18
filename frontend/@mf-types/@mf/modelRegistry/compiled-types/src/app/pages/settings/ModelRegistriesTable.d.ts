import React from 'react';
import { ModelRegistryKind, RoleBindingKind, FetchStateObject } from 'mod-arch-shared';
type ModelRegistriesTableProps = {
    modelRegistries: ModelRegistryKind[];
    refresh: () => Promise<unknown>;
    roleBindings: FetchStateObject<RoleBindingKind[]>;
    onCreateModelRegistryClick: () => void;
};
declare const ModelRegistriesTable: React.FC<ModelRegistriesTableProps>;
export default ModelRegistriesTable;
