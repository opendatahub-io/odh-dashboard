import React from 'react';
import { ModelRegistryKind } from 'mod-arch-shared';
type ModelRegistriesTableProps = {
    modelRegistries: ModelRegistryKind[];
    onCreateModelRegistryClick: () => void;
    refresh: () => void;
};
declare const ModelRegistriesTable: React.FC<ModelRegistriesTableProps>;
export default ModelRegistriesTable;
