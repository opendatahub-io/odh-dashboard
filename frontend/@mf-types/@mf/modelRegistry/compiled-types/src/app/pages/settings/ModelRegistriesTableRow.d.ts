import React from 'react';
import { ModelRegistryKind } from 'mod-arch-shared';
type ModelRegistriesTableRowProps = {
    modelRegistry: ModelRegistryKind;
    onEditRegistry: (obj: ModelRegistryKind) => void;
    onDeleteRegistry: (obj: ModelRegistryKind) => void;
};
declare const ModelRegistriesTableRow: React.FC<ModelRegistriesTableRowProps>;
export default ModelRegistriesTableRow;
