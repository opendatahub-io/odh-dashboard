import * as React from 'react';
import { KeyValuePair } from '~/shared/types';
import { EitherNotBoth } from '~/shared/typeHelpers';
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
