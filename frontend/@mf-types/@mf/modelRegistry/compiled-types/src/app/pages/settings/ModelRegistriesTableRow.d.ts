import React from 'react';
import { FetchStateObject } from 'mod-arch-shared/dist/types/common';
import { ModelRegistryKind, RoleBindingKind } from 'mod-arch-shared';
type ModelRegistriesTableRowProps = {
    modelRegistry: ModelRegistryKind;
    roleBindings: FetchStateObject<RoleBindingKind[]>;
    onEditRegistry: (obj: ModelRegistryKind) => void;
    onDeleteRegistry: (obj: ModelRegistryKind) => void;
};
declare const ModelRegistriesTableRow: React.FC<ModelRegistriesTableRowProps>;
export default ModelRegistriesTableRow;
