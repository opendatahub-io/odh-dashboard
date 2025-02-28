import React from 'react';
import { ModelRegistry } from '~/app/types';
type ModelRegistriesTableRowProps = {
    modelRegistry: ModelRegistry;
    onEditRegistry: (obj: ModelRegistry) => void;
    onDeleteRegistry: (obj: ModelRegistry) => void;
};
declare const ModelRegistriesTableRow: React.FC<ModelRegistriesTableRowProps>;
export default ModelRegistriesTableRow;
