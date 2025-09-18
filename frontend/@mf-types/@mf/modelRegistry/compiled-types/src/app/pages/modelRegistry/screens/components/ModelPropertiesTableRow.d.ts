import * as React from 'react';
import { KeyValuePair, EitherNotBoth } from 'mod-arch-core';
type ModelPropertiesTableRowProps = {
    allExistingKeys: string[];
    setIsEditing: (isEditing: boolean) => void;
    isSavingEdits: boolean;
    isArchive?: boolean;
    setIsSavingEdits: (isSaving: boolean) => void;
    saveEditedProperty: (oldKey: string, newPair: KeyValuePair) => Promise<unknown>;
} & EitherNotBoth<{
    isAddRow: true;
}, {
    isEditing: boolean;
    keyValuePair: KeyValuePair;
    deleteProperty: (key: string) => Promise<unknown>;
}>;
declare const ModelPropertiesTableRow: React.FC<ModelPropertiesTableRowProps>;
export default ModelPropertiesTableRow;
