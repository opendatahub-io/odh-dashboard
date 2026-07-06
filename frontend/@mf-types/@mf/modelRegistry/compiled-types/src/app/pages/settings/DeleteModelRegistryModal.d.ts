import React from 'react';
import { ModelRegistryKind } from 'mod-arch-shared';
type DeleteModelRegistryModalProps = {
    modelRegistry: ModelRegistryKind;
    onClose: () => void;
    refresh: () => void;
};
declare const DeleteModelRegistryModal: React.FC<DeleteModelRegistryModalProps>;
export default DeleteModelRegistryModal;
